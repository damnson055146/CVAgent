import json
import os
import threading
import time
from collections import deque
from dotenv import load_dotenv
from typing import Dict, Any, Union, Tuple, Optional, List
from openai import OpenAI, APIConnectionError, APITimeoutError, APIError

# Load environment variables from .env file
load_dotenv()

_API_KEYS: List[str] = []  # deprecated; kept for backward compatibility
_API_KEYS_LOADED = False
_RR_INDEX = 0
_RR_LOCK = threading.Lock()

# Per-key quota & windowed counters
class _KeyState:
    def __init__(self, *, provider: str, base_url: str, api_key: str, rpm_limit: Optional[int], tpm_limit: Optional[int]):
        self.provider = provider  # e.g., "siliconflow" or "openai"
        self.base_url = base_url
        self.api_key = api_key
        self.rpm_limit = rpm_limit
        self.tpm_limit = tpm_limit
        self.req_times: deque[float] = deque()
        self.token_usages: deque[tuple[float, int]] = deque()
        self.lock = threading.Lock()
        self.consecutive_failures: int = 0
        self.unhealthy_until: Optional[float] = None

    def is_healthy(self, now: float) -> bool:
        return self.unhealthy_until is None or now >= self.unhealthy_until


_KEY_STATES: List[_KeyState] = []
_WINDOW_SECONDS = 60.0
_ESTIMATED_TOKENS = int(os.getenv("SILICONFLOW_ESTIMATED_TOKENS_PER_CALL", "0") or 0)
_RETRY_MAX_ATTEMPTS = int(os.getenv("SILICONFLOW_RETRY_MAX_ATTEMPTS", "3") or 3)
_RETRY_BASE_DELAY_MS = int(os.getenv("SILICONFLOW_RETRY_BASE_DELAY_MS", "200") or 200)
_CB_THRESHOLD = int(os.getenv("SILICONFLOW_CIRCUIT_BREAK_THRESHOLD", "3") or 3)
_CB_SECONDS = float(os.getenv("SILICONFLOW_CIRCUIT_BREAK_SECONDS", "60") or 60)


def _load_api_keys_once() -> None:
    global _API_KEYS_LOADED, _KEY_STATES
    if _API_KEYS_LOADED:
        return
    # util to parse int envs
    def _int_or_none(value: Optional[str]) -> Optional[int]:
        if value is None or value == "":
            return None
        try:
            return int(value)
        except Exception:
            return None

    # SiliconFlow keys (up to 2)
    sf_base = (os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1") or "").strip()
    sf_keys: List[Tuple[str, Optional[int], Optional[int]]] = []
    sf1 = (os.getenv("SILICONFLOW_API_KEY", "") or "").strip()
    if sf1:
        sf_keys.append((sf1, _int_or_none(os.getenv("SILICONFLOW_KEY1_RPM")), _int_or_none(os.getenv("SILICONFLOW_KEY1_TPM"))))
    sf2 = (os.getenv("SILICONFLOW_API_KEY_2", "") or "").strip()
    if sf2:
        sf_keys.append((sf2, _int_or_none(os.getenv("SILICONFLOW_KEY2_RPM")), _int_or_none(os.getenv("SILICONFLOW_KEY2_TPM"))))

    # OpenAI keys (up to 2)
    oa_base = (os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1") or "").strip()
    oa_keys: List[Tuple[str, Optional[int], Optional[int]]] = []
    oa1 = (os.getenv("OPENAI_API_KEY", "") or "").strip()
    if oa1:
        oa_keys.append((oa1, _int_or_none(os.getenv("OPENAI_KEY1_RPM")), _int_or_none(os.getenv("OPENAI_KEY1_TPM"))))
    oa2 = (os.getenv("OPENAI_API_KEY_2", "") or "").strip()
    if oa2:
        oa_keys.append((oa2, _int_or_none(os.getenv("OPENAI_KEY2_RPM")), _int_or_none(os.getenv("OPENAI_KEY2_TPM"))))

    # Build states
    _KEY_STATES = []
    for k, rpm, tpm in sf_keys:
        _KEY_STATES.append(_KeyState(provider="siliconflow", base_url=sf_base, api_key=k, rpm_limit=rpm, tpm_limit=tpm))
    for k, rpm, tpm in oa_keys:
        _KEY_STATES.append(_KeyState(provider="openai", base_url=oa_base, api_key=k, rpm_limit=rpm, tpm_limit=tpm))

    if not _KEY_STATES:
        raise EnvironmentError("No API keys configured. Set SILICONFLOW_API_KEY and/or OPENAI_API_KEY (empty string means disabled).")
    _API_KEYS_LOADED = True


def _prune_windows(state: _KeyState, now: float) -> None:
    # prune requests
    while state.req_times and now - state.req_times[0] >= _WINDOW_SECONDS:
        state.req_times.popleft()
    # prune tokens
    while state.token_usages and now - state.token_usages[0][0] >= _WINDOW_SECONDS:
        state.token_usages.popleft()


def _current_tokens(state: _KeyState, now: float) -> int:
    _prune_windows(state, now)
    return sum(tokens for _, tokens in state.token_usages)


def _can_use(state: _KeyState, now: float, est_tokens: int) -> bool:
    _prune_windows(state, now)
    if not state.is_healthy(now):
        return False
    if state.rpm_limit is not None and len(state.req_times) >= state.rpm_limit:
        return False
    if state.tpm_limit is not None and (_current_tokens(state, now) + max(est_tokens, 0)) > state.tpm_limit:
        return False
    return True


def _acquire_key(est_tokens: Optional[int] = None) -> int:
    """Pick a key respecting RPM/TPM limits. Blocks if necessary until some key is available.
    Returns key_index."""
    global _RR_INDEX
    if not _API_KEYS_LOADED:
        _load_api_keys_once()
    est = _ESTIMATED_TOKENS if est_tokens is None else est_tokens
    while True:
        now = time.monotonic()
        with _RR_LOCK:
            start = _RR_INDEX
            n = len(_KEY_STATES)
            picked_idx = None
            # try each key once in RR order
            for attempt in range(n):
                idx = (start + attempt) % n
                st = _KEY_STATES[idx]
                with st.lock:
                    if _can_use(st, now, est):
                        st.req_times.append(now)  # reserve request slot
                        picked_idx = idx
                        break
            if picked_idx is not None:
                _RR_INDEX = (picked_idx + 1) % n
                return picked_idx
        # none available; compute next availability time
        min_sleep = 0.05
        for st in _KEY_STATES:
            with st.lock:
                _prune_windows(st, now)
                # time until RPM frees
                if st.rpm_limit is not None and len(st.req_times) >= st.rpm_limit:
                    rpm_wait = _WINDOW_SECONDS - (now - st.req_times[0])
                    if rpm_wait > 0:
                        min_sleep = min_sleep if min_sleep and min_sleep < rpm_wait else rpm_wait
                # time until TPM frees
                if st.tpm_limit is not None and _current_tokens(st, now) + max(est, 0) > st.tpm_limit and st.token_usages:
                    tpm_wait = _WINDOW_SECONDS - (now - st.token_usages[0][0])
                    if tpm_wait > 0:
                        min_sleep = min_sleep if min_sleep and min_sleep < tpm_wait else tpm_wait
        time.sleep(max(min_sleep, 0.05))


def _record_usage(key_index: int, used_tokens: Optional[int]) -> None:
    if used_tokens is None:
        return
    now = time.monotonic()
    st = _KEY_STATES[key_index]
    with st.lock:
        _prune_windows(st, now)
        st.token_usages.append((now, max(int(used_tokens), 0)))


def _mark_success(key_index: int) -> None:
    st = _KEY_STATES[key_index]
    with st.lock:
        st.consecutive_failures = 0
        st.unhealthy_until = None


def _mark_failure(key_index: int) -> None:
    now = time.monotonic()
    st = _KEY_STATES[key_index]
    with st.lock:
        st.consecutive_failures += 1
        if st.consecutive_failures >= _CB_THRESHOLD:
            st.unhealthy_until = now + _CB_SECONDS


def _infer_provider_for_model(model: str) -> Optional[str]:
    """Heuristically infer which provider should handle the model.
    Returns "openai", "siliconflow" or None if unknown (defaults to siliconflow).
    """
    m = (model or "").strip().lower()
    openai_prefixes = (
        "gpt-", "text-embedding", "whisper", "dall-e", "o1", "o3", "o4",
        "omni-", "chatgpt", "gpt-image-1", "tts-", "babbage-", "davinci-"
    )
    if any(m.startswith(p) for p in openai_prefixes):
        return "openai"
    return "siliconflow"


def _is_openai_restricted_model(model: str) -> bool:
    """OpenAI 一些系列（如 gpt-5*, o1*, o3*、deep-research 等）不允许自定义 temperature。
    返回 True 表示应当省略 temperature。
    """
    m = (model or "").strip().lower()
    if m.startswith("gpt-5"):
        return True
    if m.startswith("o1") or m.startswith("o3"):
        return True
    if "deep-research" in m:
        return True
    return False


def _get_client_with_index(est_tokens: Optional[int] = None) -> tuple[OpenAI, int]:
    idx = _acquire_key(est_tokens)
    st = _KEY_STATES[idx]
    return OpenAI(api_key=st.api_key, base_url=st.base_url), idx


def _get_client_for_model(model: str, est_tokens: Optional[int] = None) -> tuple[OpenAI, int]:
    """Pick a key matching the inferred provider for the model if possible; fallback to any key."""
    if not _API_KEYS_LOADED:
        _load_api_keys_once()
    desired = _infer_provider_for_model(model)
    est = _ESTIMATED_TOKENS if est_tokens is None else est_tokens
    global _RR_INDEX
    while True:
        now = time.monotonic()
        with _RR_LOCK:
            start = _RR_INDEX
            n = len(_KEY_STATES)
            picked_idx = None
            # first pass: try only desired provider
            for attempt in range(n):
                idx = (start + attempt) % n
                st = _KEY_STATES[idx]
                if desired is not None and st.provider != desired:
                    continue
                with st.lock:
                    if _can_use(st, now, est):
                        st.req_times.append(now)
                        picked_idx = idx
                        break
            # fallback pass: any provider
            if picked_idx is None:
                for attempt in range(n):
                    idx = (start + attempt) % n
                    st = _KEY_STATES[idx]
                    with st.lock:
                        if _can_use(st, now, est):
                            st.req_times.append(now)
                            picked_idx = idx
                            break
            if picked_idx is not None:
                _RR_INDEX = (picked_idx + 1) % n
                st = _KEY_STATES[picked_idx]
                return OpenAI(api_key=st.api_key, base_url=st.base_url), picked_idx
        # none available; compute backoff like _acquire_key
        min_sleep = 0.05
        for st in _KEY_STATES:
            with st.lock:
                _prune_windows(st, now)
                if st.rpm_limit is not None and len(st.req_times) >= st.rpm_limit:
                    rpm_wait = _WINDOW_SECONDS - (now - st.req_times[0])
                    if rpm_wait > 0:
                        min_sleep = min_sleep if min_sleep and min_sleep < rpm_wait else rpm_wait
                if st.tpm_limit is not None and _current_tokens(st, now) + max(est, 0) > st.tpm_limit and st.token_usages:
                    tpm_wait = _WINDOW_SECONDS - (now - st.token_usages[0][0])
                    if tpm_wait > 0:
                        min_sleep = min_sleep if min_sleep and min_sleep < tpm_wait else tpm_wait
        time.sleep(max(min_sleep, 0.05))

_DEFAULT_MODEL = os.getenv("SILICONFLOW_MODEL", "deepseek-ai/DeepSeek-V3")

def _extract_usage_from_response(response: Any) -> Tuple[Optional[int], Optional[int], Optional[int]]:
    """Best-effort extract token usage from SiliconFlow/OpenAI response."""
    try:
        usage = getattr(response, "usage", None) or {}
        prompt_tokens = getattr(usage, "prompt_tokens", None) or usage.get("prompt_tokens")
        completion_tokens = getattr(usage, "completion_tokens", None) or usage.get("completion_tokens")
        total_tokens = getattr(usage, "total_tokens", None) or usage.get("total_tokens")
        # Some providers nest usage under response.choices[0].message? keep simple
        return (
            int(prompt_tokens) if prompt_tokens is not None else None,
            int(completion_tokens) if completion_tokens is not None else None,
            int(total_tokens) if total_tokens is not None else None,
        )
    except Exception:
        return (None, None, None)


def _call_siliconflow(prompt: str, user_text: str, model: str, json_output: bool = True) -> Union[Dict[str, Any], str, Dict[str, Any]]:
    """Generic function to call the SiliconFlow API. Returns parsed content, and attaches __meta for logging if json_output."""
    client, key_idx = _get_client_for_model(model, _ESTIMATED_TOKENS)
    final_prompt = prompt.replace('{{#sys.query#}}', user_text)
    attempt = 0
    last_error: Optional[str] = None
    while attempt < _RETRY_MAX_ATTEMPTS:
        try:
            kwargs = {
                "model": model,
                "messages": [
                    {"role": "system", "content": final_prompt},
                    {"role": "user", "content": user_text},
                ],
            }
            if not _is_openai_restricted_model(model):
                kwargs["temperature"] = 0.3
            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content or ""
            prompt_tokens, completion_tokens, total_tokens = _extract_usage_from_response(response)
            _record_usage(key_idx, total_tokens or ((prompt_tokens or 0) + (completion_tokens or 0)))
            _mark_success(key_idx)

            if json_output:
                if content.startswith("```json"):
                    content = content[7:-4].strip()
                elif content.startswith("```"):
                    content = content[3:-3].strip()
                parsed = json.loads(content)
                if isinstance(parsed, dict):
                    parsed.setdefault("__meta", {})
                    parsed["__meta"].update({
                        "system_prompt": final_prompt,
                        "model": model,
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens,
                    })
                return parsed
            else:
                return content

        except (APIConnectionError, APITimeoutError, APIError) as exc:
            _mark_failure(key_idx)
            last_error = str(exc)
        except json.JSONDecodeError:
            _mark_failure(key_idx)
            return {
                "error": "Failed to parse model output as JSON.",
                "raw_output": content,
            } if json_output else content

        # backoff and try another key if available
        attempt += 1
        delay = (_RETRY_BASE_DELAY_MS / 1000.0) * (2 ** (attempt - 1))
        time.sleep(delay)
        client, key_idx = _get_client_for_model(model, _ESTIMATED_TOKENS)

    return {"error": last_error or "Unknown error"} if json_output else f"API Error: {last_error or 'Unknown error'}"


def _call_siliconflow_with_meta(prompt: str, user_text: str, model: str, json_output: bool = True) -> Tuple[Union[Dict[str, Any], str], Dict[str, Any]]:
    """Variant returning (content, meta) for logging purposes."""
    client, key_idx = _get_client_for_model(model, _ESTIMATED_TOKENS)
    final_prompt = prompt.replace('{{#sys.query#}}', user_text)
    meta: Dict[str, Any] = {"system_prompt": final_prompt, "model": model}
    try:
        kwargs = {
            "model": model,
            "messages": [
                {"role": "system", "content": final_prompt},
                {"role": "user", "content": user_text},
            ],
        }
        if not _is_openai_restricted_model(model):
            kwargs["temperature"] = 0.3
        response = client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content or ""
        pt, ct, tt = _extract_usage_from_response(response)
        _record_usage(key_idx, tt or ((pt or 0) + (ct or 0)))
        meta.update({
            "prompt_tokens": pt,
            "completion_tokens": ct,
            "total_tokens": tt,
        })

        if json_output:
            cleaned = content
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:-4].strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:-3].strip()
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                parsed = {"error": "Failed to parse model output as JSON.", "raw_output": content}
            return parsed, meta
        else:
            return content, meta
    except (APIConnectionError, APITimeoutError, APIError) as exc:
        if json_output:
            return {"error": str(exc)}, meta
        return f"API Error: {str(exc)}", meta


_PARSE_RESUME_PROMPT = """请你根据用户的输入分析提取输出部分示例的json各个字段应该填写的信息，并在输出部分填写对应的信息。
##输出
要输出标准的json格式，示例如下供参考：
{
    "user_uid": "comprehensive-test-user-01",
    "user_name": "王皓",
    "user_contact_info": {
      "phone": "139-1234-5678",
      "email": "wang.hao.dev@email.com"
    },
    "user_education": [
      {
        "user_university": "复旦大学",
        "user_major": "计算机科学与技术",
        "degree": "工学学士",
        "dates": "2020/09 - 2024/06",
        "details": "核心课程：数据结构与算法、操作系统、计算机网络、数据库系统、人工智能导论、编译原理。",
        "user_grade": "大四",
        "user_graduate_year": "2024",
        "user_gpa": "3.92/4.0",
        "user_language_score": "TOEFL: 112, GRE: 330"
      }
    ],
    "internship_experience": [
      {
        "company": "阿里巴巴集团",
        "role": "后端研发实习生 (阿里云)",
        "location": "杭州",
        "dates": "2023/07 - 2023/09",
        "description_points": [
          "参与阿里云存储服务核心模块的开发，使用 Go 语言编写高并发的API接口，QPS提升15% Gainesville。",
          "负责设计并实现一套内部监控系统，用于追踪服务健康状况和关键性能指标（KPIs）。",
          "协助进行单元测试和集成测试，确保代码质量和服务的稳定性。"
        ]
      }
    ],
    "user_research_experience": [],
    "user_extracurricular_activities": [],
    "user_target": ""
}
若无输入则保留空值
重要提示：你的回答必须是一个完整的、格式正确的JSON对象，不能包含任何解释性文字、代码块标记(```json)或其他任何非JSON内容。你的回答必须以 '{' 开始，并以 '}' 结束。
##输入
{{#sys.query#}}"""

_REWRITE_TEXT_PROMPT = """##任务

            请你根据用户的输入进行改写，使其表达更加书面，改写后的长度尽量在原长度的120%以内。改写时优先保证语义，其次保证长度。

            ##输出

            输出你根据任务所得的句子。

            你只需要返回处理后的文本，严禁包含任何额外的解释、括号、统计信息或原句，只输出最终结果。

            ##输入

            {{#sys.query#}}"""

_EXPAND_TEXT_PROMPT = """##任务

            请你根据用户的输入进行扩句，扩句长度至原长度的125%左右。优先保证语义，其次保证长度。

            ##输出

            输出你根据任务所得的句子。

            你只需要返回处理后的文本，严禁包含任何额外的解释、括号、统计信息或原句，只输出最终结果。

            ##输入

            {{#sys.query#}}"""

_CONTRACT_TEXT_PROMPT = """##任务

            请你根据用户的输入进行缩句，缩句长度至原长度的80%左右。优先保证语义，其次保证长度。

            ##输出

            输出你根据任务所得的句子。

            你只需要返回处理后的文本，严禁包含任何额外的解释、括号、统计信息或原句，只输出最终结果。

            ##输入

            {{#sys.query#}}"""

_EVALUATE_RESUME_PROMPT = """##任务

            你是一名专业的简历辅导师，用户的输入的json为用户的简历信息，请你根据用户的输入的json分析简历中哪些部分可以优化，给出你的优化建议。

            ##输出

            输出一段话，给出你的优化建议即可。

            要求输出的一段话，语言流畅。严禁包含任何额外的注释信息、括号，只输出最终结果。

            ##输入

            {{#sys.query#}}"""

_GENERATE_STATEMENT_PROMPT = """你是一位资深留学申请辅导老师，请为一名申请人撰写一篇有说服力的中文个人陈述。请根据以下中文背景信息和要求生成，字数约600–800字，语气真诚、明确、有远见，突出动机、学术与科研成果、领导经历、职业规划、个人成长故事及核心技能，并点明为何选择学校及相关导师。
            ##写作要求
长度：600–800字
结构：开头引出动机，中间分段论述科研、领导、规划与成长，结尾呼应并展望未来
语气：真诚、自信、富有激情
            强调学校的优势资源、具体导师如何助力申请人实现目标
避免空洞陈词，举具体例证，体现个人特色与对项目契合度
##输出格式（重要）
只返回一个 JSON 对象。键名必须使用英文，值为中文内容。严格使用以下键：
{
  "personal_statement": {
    "introduction_and_goals": "",
    "research_experience": "",
    "activities_and_leadership": "",
    "career_plan": "",
    "reasons_for_school": "",
    "conclusion": ""
  }
}
禁止包含除上述 JSON 外的任何文字或代码块标记（如 ```json）。
##输入
{{#sys.query#}}"""

_GENERATE_RECOMMENDATION_PROMPT = """You are an experienced academic recommender. Please write a formal, formatted Letter of Recommendation in English, addressed to the Admissions Committee at University College London, based on the information provided about the candidate and recommender. Use the following template and fill in the placeholders:

【Recommender’s Letterhead】  
Recommender Name, Title  
Department  
Institution Name  
Street Address  
City, Postal Code, Country  
Phone:  
Email:  

【Date】  

Admissions Committee  
University College London  
Gower Street  
London, WC1E 6BT  
United Kingdom  

Dear Members of the Admissions Committee:

I am writing to offer my strongest recommendation for {{Candidate Name}}’s application to the {{Program Name}} at {{Target University}}. As {{Recommender Title and Position}} in the {{Recommender Department}} at {{Recommender Institution}}, I have known {{Candidate Name}} for {{Duration}} through {{Courses/Supervision/Projects}}.

In the body of the letter, please include:  
1. **Academic excellence**: GPA, class ranking, key course grades.  
2. **Research achievements**: project title, candidate’s role, specific contributions, outcomes (publications, presentations).  
3. **Leadership & teamwork**: positions held, events organized, impact on community.  
4. **Personal qualities**: perseverance, communication, adaptability, with concrete examples (e.g. overcoming challenges).  
5. **English proficiency**: TOEFL/IELTS score or equivalent, ability to engage in English-medium research.  
6. **Career goals & fit**: candidate’s short- and long-term goals, why the target program/institution and specific faculty (e.g., Prof. X) are ideal.  

Conclude with a clear, unreserved recommendation and invitation to contact you for further information.

Sincerely,  

{{Recommender Name}}  
{{Recommender Title}}  
{{Recommender Department}}  
{{Recommender Institution}}  
Phone: {{Recommender Phone}}  
Email: {{Recommender Email}}  

##input

The input is a piece of information in chinese about the applicant's personal details.
{{#sys.query#}}
##output

Output in JSON nested Markdown format. Next is an example，The output must strictly follow the following structure. Output in English.

{
  "recommendation_letter" : {
    "header": {
      "institution": "清华大学",
      "department": "计算机科学与技术系",
      "address": "北京市海淀区清华大学计算机楼203室",
      "postal_code": "100084",
      "country": "中国",
      "phone": "+86-10-6278-1234",
      "email": "chenwei@tsinghua.edu.cn"
    },
    "date": "2025年1月10日",
    "recipient": {
      "university": "University College London",
      "address": "Gower Street, London, WC1E 6BT, United Kingdom"
    },
    "salutation": "尊敬的招生委员会成员：",
    "body": [
      "我谨以最强烈的推荐，支持李明（Li Ming）申请贵校的计算机科学硕士项目（MSc in Computer Science）。作为清华大学计算机科学与技术系的副教授和博士生导师，我有幸在过去的五个学期里指导李明，每周两次课程交流以及每月一次实验室进展汇报，对他的学术能力和个人品质有深入的了解。",
      "李明的学术表现非常出色，他在本科阶段的GPA为3.85/4.0，专业排名前5%。他在高级算法（A）、机器学习（A+）、深度学习（A+）和计算机视觉（A）等核心课程中表现优异，充分展现了他在计算机科学领域的扎实基础和卓越能力。",
      "在研究方面，李明作为“基于深度学习的医学影像分析”项目的主要研究人员，设计并优化了多尺度卷积神经网络。他采用数据增强与模型集成技术，将检测准确率提升了12%，并组织团队构建了端到端的自动化流程，显著缩短了实验周期30%。他的研究成果以题为“Automated Pulmonary Nodule Detection via CNN”的论文在MICCAI 2024上进行了口头报告，这充分体现了他在学术研究上的创新性和影响力。",
      "除了学术和研究上的成就，李明在领导力和团队合作方面也表现突出。他担任清华大学编程俱乐部主席期间，策划并主持了“HackTsinghua”24小时编程马拉松，吸引了200多名学生和50支队伍参与。他还举办了Python与算法工作坊，帮助30余名新生提升编程能力。在科研团队中，他担任联络人，确保跨学科合作的顺畅进行，并在MICCAI论文截稿前夕带领团队连续两周加班完成模型调优，展现了极强的责任感和团队精神。",
      "李明来自四川偏远山区，通过自学掌握了编程和数学知识，展现出了非凡的毅力和自我驱动力。为了提升英语水平，他每天背诵医学影像领域的核心论文摘要并参加英语角，半年内托福成绩提升至110分。他的这些努力和成果充分证明了他具备在贵校全英文教学环境中学习和研究的语言能力。",
      "李明的短期目标是加入DeepMind或Google Research从事医疗AI工具研发，长期愿景是在五年内成为可解释AI领域的专家，推动智能诊断的普及以减少医疗资源不平等。我相信，贵校的计算机科学硕士项目将为他的职业发展提供理想的学习和研究平台，他也将为贵校的学术社区带来宝贵的贡献。",
      "综上所述，我毫无保留地推荐李明加入贵校的计算机科学硕士项目。如需进一步了解他的情况，请随时与我联系。"
    ],
    "closing": {
      "sincerely": "此致",
      "name": "陈伟",
      "title": "副教授、博士生导师",
      "department": "计算机科学与技术系",
      "institution": "清华大学",
      "phone": "+86-10-6278-1234",
      "email": "chenwei@tsinghua.edu.cn"
    }
  }
}

Output in English. Generate a recommendation letter based on the information provided by the user. If some necessary information is not input by the user, then this section does not need to be presented in the recommendation letter. It is strictly prohibited to fabricate any facts about the user."""

_NAME_DOCUMENT_PROMPT = """##任务

            请你对用户的输入的简历进行命名，命名要言简意赅，描述符和简历。

            ##输出

            你只需要返回处理后得到的文本，不要包含任何额外的解释、括号、统计信息或原句。只输出最终结果。

            ##输入

            {{#sys.query#}}"""


def parse_text(text: str, *, model: str = _DEFAULT_MODEL) -> Dict[str, Any]:
    """Sends resume text to SiliconFlow for parsing."""
    return _call_siliconflow(_PARSE_RESUME_PROMPT, text, model, json_output=True)

def rewrite_text(text: str, *, model: str = _DEFAULT_MODEL) -> str:
    """Sends text to SiliconFlow for rewriting."""
    return _call_siliconflow(_REWRITE_TEXT_PROMPT, text, model, json_output=False)

def expand_text(text: str, *, model: str = _DEFAULT_MODEL) -> str:
    """Sends text to SiliconFlow for expansion."""
    return _call_siliconflow(_EXPAND_TEXT_PROMPT, text, model, json_output=False)

def contract_text(text: str, *, model: str = _DEFAULT_MODEL) -> str:
    """Sends text to SiliconFlow for contraction."""
    return _call_siliconflow(_CONTRACT_TEXT_PROMPT, text, model, json_output=False)

def process_json_as_text(text: str, *, model: str = _DEFAULT_MODEL) -> str:
    """Sends json as text to SiliconFlow for processing."""
    return _call_siliconflow(_EVALUATE_RESUME_PROMPT, text, model, json_output=False)

def generate_with_prompt(text: str, prompt: str, *, model: str = _DEFAULT_MODEL) -> str:
    """Generates text using a dynamic prompt."""
    return _call_siliconflow(prompt, text, model, json_output=False)

def generate_statement(text: str, *, model: str = _DEFAULT_MODEL) -> Dict[str, Any]:
    """Generates a personal statement."""
    return _call_siliconflow(_GENERATE_STATEMENT_PROMPT, text, model, json_output=True)

def generate_recommendation(text: str, *, model: str = _DEFAULT_MODEL) -> Dict[str, Any]:
    """Generates a recommendation letter."""
    return _call_siliconflow(_GENERATE_RECOMMENDATION_PROMPT, text, model, json_output=True)

def name_document(text: str, *, model: str = _DEFAULT_MODEL) -> str:
    """Names a document based on its content."""
    return _call_siliconflow(_NAME_DOCUMENT_PROMPT, text, model, json_output=False)


# 生成用于个人陈述写作的“用户画像”Markdown段落
_GENERATE_PS_PROFILE_PROMPT = """你是一名资深留学文书导师。请基于用户提供的个人经历与目标（Markdown 文本）提炼出一段用于撰写个人陈述的“用户画像”。\n\n要求：\n- 只输出一段 Markdown 文本（不含```代码块标记、不含JSON、不含解释与前后缀）\n- 语言精炼且信息密度高，150–250字为宜\n- 覆盖要点：学术背景与优势、研究/职业兴趣、核心技能与成果、领导/活动亮点、申请动机与目标、与目标项目/导师的契合度与差异化。不可以捏造用户信息，所有输出的信息必须来源于输入信息\n\n输入：\n{{#sys.query#}}"""

def generate_personal_statement_profile(text: str, *, model: str = _DEFAULT_MODEL) -> str:
    """Generates a concise user persona paragraph (Markdown) for personal statement writing."""
    return _call_siliconflow(_GENERATE_PS_PROFILE_PROMPT, text, model, json_output=False)


# 从输入中判断候选人的姓名，仅返回姓名本身，无法确定则返回空字符串
_EXTRACT_NAME_PROMPT = """任务：从用户提供的中文或英文文本中抽取候选人的真实姓名。

严格输出：
- 只返回姓名本身，不要任何前后缀、标点、空格或解释性文字；不得使用代码块；不得换行。

判定与优先级（从高到低）：
1) 显式写法：出现以下直陈表达时，提取冒号或系词后的姓名：
   - 姓名: / 姓名： / 我叫 / 我的名字是
   - Name: / My name is / I am
2) 标题/抬头写法：若首行或标题包含以下模式，则优先提取标题中的姓名：
   - “某某个人简历 / 某某简历 / 某某的简历 / 某某简历（CV） / Resume of 某某 / CV of 某某”
   - 提取其中的“某某”作为姓名。
3) 若存在称谓后缀（同学、先生、女士、同学、同学简历等），去掉称谓，仅保留姓名。

禁止与边界：
- 不得从邮箱、用户名、社交账号ID、链接、文件名中推断姓名。
- 不得凭常识或占位符（如 zhangsan、lisi、test 等）臆测；但若标题明确为“张三个人简历”，则“张三”视为明确姓名。
- 若仍无法确定明确姓名，返回空字符串。

示例：
- 输入：“# 张三个人简历\n……”，输出：张三
- 输入：“姓名：李四\n……”，输出：李四
- 输入：“Resume of Wang Hao\n……”，输出：Wang Hao
- 输入：“My name is Alice Chen. ……”，输出：Alice Chen
- 输入：“邮箱：abc@example.com（未出现任何姓名线索）”，输出：

输入：
{{#sys.query#}}"""

def extract_name(text: str, *, model: str = _DEFAULT_MODEL) -> str:
    """Extracts a person's name from free-form text. Returns empty string if uncertain."""
    return _call_siliconflow(_EXTRACT_NAME_PROMPT, text, model, json_output=False)


def list_all_models() -> Dict[str, Any]:
    """Enumerate models across all configured providers/keys.
    Returns { "providers": [{provider, base_url, key_index, models, error?}], "unique_models": [..] }
    """
    if not _API_KEYS_LOADED:
        _load_api_keys_once()
    providers: List[Dict[str, Any]] = []
    unique: set[str] = set()
    for idx, st in enumerate(_KEY_STATES):
        try:
            client = OpenAI(api_key=st.api_key, base_url=st.base_url)
            resp = client.models.list()
            ids: List[str] = []
            data = getattr(resp, "data", []) or []
            for m in data:
                mid = getattr(m, "id", None)
                if mid:
                    ids.append(mid)
                    unique.add(mid)
            providers.append({
                "provider": st.provider,
                "base_url": st.base_url,
                "key_index": idx,
                "models": ids,
            })
        except Exception as exc:
            providers.append({
                "provider": st.provider,
                "base_url": st.base_url,
                "key_index": idx,
                "models": [],
                "error": str(exc),
            })
    return {"providers": providers, "unique_models": sorted(list(unique))}