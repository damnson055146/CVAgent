

import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Dict

# 在所有配置读取之前加载 .env 文件
load_dotenv()


class Settings(BaseModel):
    """
    应用配置模型，通过 Pydantic 自动加载和验证环境变量。
    """
    # 服务鉴权密钥
    API_KEY: str = os.getenv("API_KEY")

    # Dify 服务配置
    DIFY_API_URL: str = os.getenv("DIFY_API_URL")

    # Dify 各功能对应的密钥
    DIFY_API_KEYS: Dict[str, str] = {
        'parse': os.getenv("DIFY_API_KEY_PARSE"),
        'rewrite': os.getenv("DIFY_API_KEY_REWRITE"),
        'expand': os.getenv("DIFY_API_KEY_EXPAND"),
        'contract': os.getenv("DIFY_API_KEY_CONTRACT"),
        'process_text': os.getenv("DIFY_API_KEY_PROCESS_TEXT"),
        'personal_statement': os.getenv("DIFY_API_KEY_PERSONAL_STATEMENT"),
        'recommendation': os.getenv("DIFY_API_KEY_RECOMMENDATION"),
        'prompt_based': os.getenv("DIFY_API_KEY_PROMPT_BASED"),  # 新增
    }

    # 校验所有必要环境变量是否已设置
    def __init__(self, **data):
        super().__init__(**data)
        if not self.API_KEY or not self.DIFY_API_URL or not all(self.DIFY_API_KEYS.values()):
            raise ValueError("缺少必要的环境变量，请检查 .env 文件配置。")


# 创建一个全局唯一的配置实例
settings = Settings()