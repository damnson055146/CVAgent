from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

class DocumentTypeEnum(str, Enum):
    resume             = "resume"
    personal_statement = "personal_statement"
    recommendation     = "recommendation"

class APIDocType(str, Enum):
    resume             = "resume"
    personal_statement = "personal_statement"
    recommendation     = "recommendation"

class UserCreate(BaseModel):
    email: EmailStr
    password_hash: str = Field(..., min_length=40, max_length=255)
    role: str = Field('guest', pattern=r'^(guest|vvip|consultant|etc\.\.)$')
    status: int = Field(1, ge=0, le=2)
    failed_login_attempts: int = 0
    locked_until: datetime | None = None
    last_login_at: datetime | None = None
    deleted_at: datetime | None = None
    user_metadata: dict = Field(default_factory=dict, alias="metadata")

    model_config = {
        "populate_by_name": True
    }

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    status: int
    failed_login_attempts: int
    locked_until: datetime | None
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None
    user_metadata: dict = Field(..., alias="metadata")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }

# 请求体，只要 user_id
class UserDocQuery(BaseModel):
    user_id: UUID

# 用户登录请求和响应
class UserLogin(BaseModel):
    email: EmailStr
    password_hash: str = Field(..., min_length=40, max_length=255)

class TokenResponse(BaseModel):
    # access_token: str
    access_token: UUID
    token_type: str = "bearer"

    model_config = {
        "from_attributes": True
    }

# 请求体
class DocumentSave(BaseModel):
    user_id: UUID
    content_md: str = Field(..., min_length=1)

    model_config = {
        "populate_by_name": True
    }

# 响应体：包含文档元信息和当前版本内容
class DocumentWithContent(BaseModel):
    id: UUID
    user_id: UUID
    type: DocumentTypeEnum
    current_version_id: UUID
    content_md: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }





