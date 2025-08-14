import json
import time
from typing import Dict, Any, Optional, Tuple, List
from openai import OpenAI, AsyncOpenAI
import httpx
from app.core.config import settings
from .conversation_manager import ConversationSession

class AIClient:
    """AI客户端，支持OpenAI和SiliconFlow"""
    
    def __init__(self):
        self.openai_client = None
        self.siliconflow_client = None
        self._init_clients()
    
    def _init_clients(self):
        """初始化AI客户端"""
        # 初始化OpenAI客户端
        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL
            )
        
        # SiliconFlow客户端使用httpx
        if settings.SILICONFLOW_API_KEY:
            self.siliconflow_client = httpx.AsyncClient(
                base_url=settings.SILICONFLOW_BASE_URL,
                headers={
                    "Authorization": f"Bearer {settings.SILICONFLOW_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=60.0
            )
    
    async def generate_brainstorm_questions(
        self,
        cv_content: str,
        manual_info: Dict[str, Any],
        user_profile: str = "",
        model: str = "deepseek-ai/DeepSeek-V3",
        session: Optional[ConversationSession] = None
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """生成头脑风暴问题"""
        
        # 构建提示词
        prompt = self._build_brainstorm_prompt(cv_content, manual_info, user_profile, session)
        
        # 根据模型选择客户端
        if "deepseek" in model.lower() or "siliconflow" in model.lower():
            return await self._call_siliconflow(prompt, model)
        else:
            return await self._call_openai(prompt, model)
    
    async def chat_with_context(
        self,
        user_message: str,
        session: ConversationSession,
        model: str = "deepseek-ai/DeepSeek-V3"
    ) -> Tuple[str, Dict[str, Any]]:
        """基于上下文的对话"""
        
        # 构建对话消息
        messages = self._build_chat_messages(user_message, session)
        
        # 根据模型选择客户端
        if "deepseek" in model.lower() or "siliconflow" in model.lower():
            return await self._call_siliconflow_chat(messages, model)
        else:
            return await self._call_openai_chat(messages, model)
    
    def _build_brainstorm_prompt(
        self,
        cv_content: str,
        manual_info: Dict[str, Any],
        user_profile: str,
        session: Optional[ConversationSession] = None
    ) -> str:
        """构建头脑风暴提示词"""
        
        # 基础提示词
        base_prompt = """你是一个专业的留学申请顾问，专门为申请者生成个性化的头脑风暴问题。请基于以下信息生成6个类别的问题，每个类别3-5个问题：

问题类别：
1. 学术背景 (academic) - 关于学术成就、课程、成绩等
2. 研究经历 (research) - 关于研究项目、论文、实验室经验等
3. 领导力 (leadership) - 关于社团、组织、团队合作等
4. 个人特质 (personal) - 关于性格、兴趣、价值观等
5. 职业规划 (career) - 关于职业目标、行业选择等
6. 申请动机 (motivation) - 关于为什么选择这个专业/学校等

要求：
- 问题要具体、有针对性
- 每个问题都要有明确的优先级（1-5，5为最高）
- 问题要能够帮助申请者深入思考
- 考虑用户画像信息，确保问题与用户背景匹配

请以JSON格式返回，格式如下：
{
  "questions": [
    {
      "academic": [
        {
          "question": "问题内容",
          "category": "academic",
          "priority": 5,
          "context": "问题背景说明"
        }
      ]
    },
    {
      "research": [...]
    }
  ]
}"""

        # 添加用户信息
        user_info = f"""
用户简历内容：
{cv_content if cv_content else "未提供简历内容"}

用户手动输入信息：
{json.dumps(manual_info, ensure_ascii=False, indent=2) if manual_info else "未提供额外信息"}

用户画像信息：
{user_profile if user_profile else "未提供用户画像"}
"""

        # 添加对话历史上下文
        conversation_context = ""
        if session:
            conversation_context = self._build_conversation_context(session)
            user_info += f"\n\n对话历史上下文：\n{conversation_context}"

        user_info += "\n\n请基于以上信息生成个性化的头脑风暴问题。确保问题与用户的具体背景和画像高度匹配。"
        
        return base_prompt + user_info
    
    async def _call_siliconflow(self, prompt: str, model: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """调用SiliconFlow API"""
        if not self.siliconflow_client:
            raise Exception("SiliconFlow客户端未初始化")
        
        try:
            response = await self.siliconflow_client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "你是一个专业的留学申请顾问，专门生成个性化的头脑风暴问题。"},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"SiliconFlow API错误: {response.status_code}")
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # 解析JSON响应
            try:
                parsed_content = json.loads(content)
            except json.JSONDecodeError:
                # 如果JSON解析失败，尝试提取JSON部分
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    parsed_content = json.loads(json_match.group())
                else:
                    raise Exception("无法解析AI响应为JSON格式")
            
            meta = {
                "model": model,
                "provider": "siliconflow",
                "prompt_tokens": result.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": result.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": result.get("usage", {}).get("total_tokens", 0)
            }
            
            return parsed_content, meta
            
        except Exception as e:
            raise Exception(f"SiliconFlow调用失败: {str(e)}")
    
    async def _call_openai(self, prompt: str, model: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """调用OpenAI API"""
        if not self.openai_client:
            raise Exception("OpenAI客户端未初始化")
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "你是一个专业的留学申请顾问，专门生成个性化的头脑风暴问题。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            
            # 解析JSON响应
            try:
                parsed_content = json.loads(content)
            except json.JSONDecodeError:
                # 如果JSON解析失败，尝试提取JSON部分
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    parsed_content = json.loads(json_match.group())
                else:
                    raise Exception("无法解析AI响应为JSON格式")
            
            meta = {
                "model": model,
                "provider": "openai",
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
            
            return parsed_content, meta
            
        except Exception as e:
            raise Exception(f"OpenAI调用失败: {str(e)}")
    
    async def align_with_user_profile(
        self,
        questions: Dict[str, Any],
        user_profile: str,
        model: str = "deepseek-ai/DeepSeek-V3"
    ) -> str:
        """与用户画像对齐"""
        if not user_profile:
            return "未提供用户画像信息"
        
        alignment_prompt = f"""
请分析以下头脑风暴问题是否与用户画像高度匹配，并提供对齐建议：

用户画像：
{user_profile}

头脑风暴问题：
{json.dumps(questions, ensure_ascii=False, indent=2)}

请从以下角度分析：
1. 问题是否与用户的学术背景匹配
2. 问题是否与用户的研究经历相关
3. 问题是否考虑了用户的个人特质
4. 问题是否与用户的职业规划一致
5. 是否需要调整问题以更好地匹配用户画像

请提供具体的对齐建议和改进意见。
"""
        
        try:
            if "deepseek" in model.lower() or "siliconflow" in model.lower():
                result, _ = await self._call_siliconflow(alignment_prompt, model)
            else:
                result, _ = await self._call_openai(alignment_prompt, model)
            
            return result if isinstance(result, str) else str(result)
            
        except Exception as e:
            return f"用户画像对齐分析失败: {str(e)}"
    
    def _build_conversation_context(self, session: ConversationSession) -> str:
        """构建对话上下文"""
        if not session.messages:
            return "无对话历史"
        
        context_parts = []
        context_parts.append("=== 对话历史 ===")
        
        # 获取最近的对话历史
        recent_messages = session.get_conversation_history(max_messages=5)
        for msg in recent_messages:
            role = "用户" if msg["role"] == "user" else "助手"
            context_parts.append(f"{role}: {msg['content'][:200]}...")
        
        # 添加上下文摘要
        context_summary = session.get_context_summary()
        if context_summary:
            context_parts.append(f"\n=== 上下文摘要 ===\n{context_summary}")
        
        return "\n".join(context_parts)
    
    def _build_chat_messages(self, user_message: str, session: ConversationSession) -> List[Dict[str, str]]:
        """构建聊天消息列表"""
        messages = []
        
        # 系统消息
        system_message = """你是一个专业的留学申请顾问，专门帮助申请者进行头脑风暴和深度思考。

你的职责：
1. 基于用户的背景信息提供个性化的建议
2. 引导用户深入思考申请相关问题
3. 记住对话历史，提供连贯的建议
4. 根据用户的反馈调整问题方向
5. 帮助用户明确申请目标和动机

请保持专业、友好、有耐心的态度，确保建议具有针对性和实用性。"""
        
        messages.append({"role": "system", "content": system_message})
        
        # 添加上下文信息
        context_info = session.get_context_summary()
        if context_info:
            context_messages = f"用户背景信息：\n{context_info}\n\n请基于以上背景信息与用户对话。"
            messages.append({"role": "system", "content": context_messages})
        
        # 添加对话历史
        conversation_history = session.get_conversation_history(max_messages=8)
        for msg in conversation_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        # 添加当前用户消息
        messages.append({"role": "user", "content": user_message})
        
        return messages
    
    async def _call_siliconflow_chat(self, messages: List[Dict[str, str]], model: str) -> Tuple[str, Dict[str, Any]]:
        """调用SiliconFlow进行对话"""
        if not self.siliconflow_client:
            raise Exception("SiliconFlow客户端未初始化")
        
        try:
            response = await self.siliconflow_client.post(
                "/chat/completions",
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1500
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"SiliconFlow API错误: {response.status_code}")
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            meta = {
                "model": model,
                "provider": "siliconflow",
                "prompt_tokens": result.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": result.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": result.get("usage", {}).get("total_tokens", 0)
            }
            
            return content, meta
            
        except Exception as e:
            raise Exception(f"SiliconFlow调用失败: {str(e)}")
    
    async def _call_openai_chat(self, messages: List[Dict[str, str]], model: str) -> Tuple[str, Dict[str, Any]]:
        """调用OpenAI进行对话"""
        if not self.openai_client:
            raise Exception("OpenAI客户端未初始化")
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_tokens=1500
            )
            
            content = response.choices[0].message.content
            
            meta = {
                "model": model,
                "provider": "openai",
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
            
            return content, meta
            
        except Exception as e:
            raise Exception(f"OpenAI调用失败: {str(e)}")

# 全局AI客户端实例
ai_client = AIClient()
