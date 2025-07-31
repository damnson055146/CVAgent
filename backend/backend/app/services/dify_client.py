

import requests
import json
from typing import Dict, Any
from urllib.parse import urlparse, urlunparse
from app.core.config import settings


class DifyClient:
    """
    Dify API 客户端，封装了对Dify各项功能的调用。
    """

    def __init__(self, base_url: str, api_keys: Dict[str, str], timeout: int = 120):
        # 解析传入的URL，并只保留 scheme 和 netloc (例如 'http://localhost:8681')
        parsed_url = urlparse(base_url)
        self.base_url = urlunparse((parsed_url.scheme, parsed_url.netloc, '', '', '', ''))

        self.api_keys = api_keys
        self.timeout = timeout

    def _post(self, path: str, key_name: str, payload: Dict[str, Any]) -> requests.Response:
        """
        一个通用的POST请求方法。
        """
        url = f"{self.base_url}{path}"
        headers = {
            'Authorization': f"Bearer {self.api_keys[key_name]}",
            'Content-Type': 'application/json'
        }
        return requests.post(url, headers=headers, json=payload, timeout=self.timeout)

    def _clean_response(self, text: str) -> str:
        """清理Dify返回的字符串，移除Markdown代码块标记。"""
        if text.strip().startswith("```json"):
            text = text.strip()[7:-3].strip()
        return text

    def parse_text(self, text: str) -> Dict[str, Any]:
        """调用Dify解析文本，返回结构化JSON。"""
        payload = {"inputs": {}, "query": text, "response_mode": "blocking", "user": "resume-parser-user"}
        try:
            response = self._post('/v1/chat-messages', 'parse', payload)
            response.raise_for_status()
            answer = response.json().get('answer', '{}')
            cleaned_answer = self._clean_response(answer)
            return json.loads(cleaned_answer)
        except Exception as e:
            return {"error": f"调用Dify解析接口失败: {e}"}

    def _call_text_modification_api(self, key_name: str, text: str, user: str) -> str:
        """调用文本修改类API（改写、扩写、缩写）的通用方法。"""
        payload = {"inputs": {}, "query": text, "response_mode": "blocking", "user": user}
        try:
            response = self._post('/v1/chat-messages', key_name, payload)
            response.raise_for_status()
            return response.json().get('answer', 'Dify未能返回有效结果。')
        except Exception as e:
            return f"调用Dify {key_name} 接口失败: {e}"

    def rewrite_text(self, text: str) -> str:
        return self._call_text_modification_api('rewrite', text, 'rewrite-user')

    def expand_text(self, text: str) -> str:
        return self._call_text_modification_api('expand', text, 'expand-user')

    def contract_text(self, text: str) -> str:
        return self._call_text_modification_api('contract', text, 'contract-user')

    def process_json_as_text(self, text: str) -> str:
        return self._call_text_modification_api('process_text', text, 'process-text-user')

    def generate_statement(self, text: str) -> str:
        return self._call_text_modification_api('personal_statement', text, 'statement-user')

    def generate_recommendation(self, text: str) -> Dict[str, Any]:
        """调用Dify生成推荐信，期望返回一个包含Markdown的JSON结构。"""
        payload = {"inputs": {}, "query": text, "response_mode": "blocking", "user": "recommendation-user"}
        try:
            response = self._post('/v1/chat-messages', 'recommendation', payload)
            response.raise_for_status()
            # 假设Dify的'answer'字段本身就是一个JSON字符串
            answer = response.json().get('answer', '{}')
            return json.loads(self._clean_response(answer))
        except Exception as e:
            return {"error": f"调用Dify推荐信接口失败: {e}"}

    def generate_with_prompt(self, text: str, prompt: str) -> str:
        """
        调用Dify，将前端传入的 'prompt' 放入 Dify 的 'inputs.prompt'，
        将前端传入的 'text' 放入 Dify 的 'query'。
        """
        payload = {
            "inputs": {"prompt": prompt},  # 'prompt' 字段进入 inputs
            "query": text,                 # 'text' 字段进入 query (sys.query)
            "response_mode": "blocking",
            "user": "prompt-based-user"
        }
        try:
            # 假设此功能也使用 'prompt_based' 的密钥
            response = self._post('/v1/chat-messages', 'prompt_based', payload)
            response.raise_for_status()
            return response.json().get('answer', 'Dify未能返回有效结果。')
        except Exception as e:
            return f"调用Dify prompt-based接口失败: {e}"

    def name_document(self, text: str) -> str:
        """调用Dify为传入的Markdown文本生成一个标题。"""
        return self._call_text_modification_api('naming', text, 'naming-user')


# 创建一个全局的Dify客户端实例
dify_client = DifyClient(settings.DIFY_API_URL, settings.DIFY_API_KEYS)