from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from enum import Enum

# --- 认证相关模型 ---
class UserCreate(BaseModel):
    username: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str  # 可以是邮箱或用户名
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None

class UserInDB(BaseModel):
    id: str
    username: Optional[str]
    email: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- 通用输入模型 ---
class TextInput(BaseModel):
    text: str = Field(..., min_length=1)

# 新增：用于接收文本和Prompt的模型
class PromptTextInput(BaseModel):
    text: str
    prompt: str

# --- 简历生成相关的结构化模型 ---
class ContactInfo(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None

class EducationItem(BaseModel):
    user_university: str
    user_major: str
    degree: str
    dates: str
    details: Optional[str] = None
    user_grade: Optional[str] = None
    user_graduate_year: Optional[str] = None
    user_gpa: Optional[str] = None
    user_language_score: Optional[str] = None

class ExperienceItem(BaseModel):
    company: str
    role: str
    location: Optional[str] = None
    dates: str
    description_points: List[str]

class ResearchItem(BaseModel):
    research_project: str = Field(..., alias='research project')
    role: str
    location: Optional[str] = None
    dates: str
    description_points: List[str]

class ActivityItem(BaseModel):
    organization: str
    role: str
    location: Optional[str] = None
    dates: str
    description_points: List[str]

# 统一的简历数据模型
class NewResumeProfile(BaseModel):
    user_uid: str
    user_name: str
    user_contact_info: ContactInfo
    user_education: List[EducationItem]
    internship_experience: List[ExperienceItem]
    user_research_experience: Optional[List[ResearchItem]] = []
    user_extracurricular_activities: Optional[List[ActivityItem]] = []
    user_target: Optional[str] = None

class APIDocType(str, Enum):
    """API层面的文档类型枚举。"""
    resume = "resume"
    personal_statement = "personal_statement"
    recommendation = "recommendation"

class UserDocQuery(BaseModel):
    """用于需要用户ID的请求体的模式。"""
    user_id: uuid.UUID

class DocumentVersionHistoryItem(BaseModel):
    """用于文档历史记录列表项的模式。"""
    id: uuid.UUID
    version_number: int
    created_at: datetime
    content_snippet: str

class DocumentVersionContent(BaseModel):
    """用于返回版本完整内容的模式。"""
    id: uuid.UUID
    content: str

    class Config:
        from_attributes = True

from datetime import datetime
from enum import Enum
from uuid import UUID
from typing import List # --- 新增导入 ---

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

# --- 新增 Schema 用于历史记录列表 ---
class DocumentVersionHistoryItem(BaseModel):
    id: UUID
    version_number: int
    created_at: datetime
    content_snippet: str  # 返回内容摘要，而不是全文

    model_config = {
        "from_attributes": True,
    }

# --- 新增 Schema 用于返回单个版本的完整内容 ---
class DocumentVersionContent(BaseModel):
    id: UUID
    content: str

    model_config = {
        "from_attributes": True,
    }



