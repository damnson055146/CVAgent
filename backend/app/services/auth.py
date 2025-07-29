import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

# 定义从请求头 'X-API-Key' 中获取密钥的方案
api_key_header_scheme = APIKeyHeader(name="X-API-Key")

class APIKeyValidator:
    """
    API Key 验证器类，用于验证请求头中的 X-API-Key。
    """
    def __init__(self, expected_key: str):
        self.expected_key = expected_key

    async def __call__(self, api_key_header: str = Depends(api_key_header_scheme)) -> str:
        """
        作为FastAPI依赖项被调用，验证传入的API Key。
        """
        if self.expected_key and secrets.compare_digest(api_key_header, self.expected_key):
            return api_key_header
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无效的 API Key 或权限不足"
        )

# 创建一个全局的验证器实例，供路由层直接使用
auth_validator = APIKeyValidator(settings.API_KEY)
