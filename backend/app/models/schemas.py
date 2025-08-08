from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from uuid import UUID
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
class ModelChoice(str, Enum):
    deepseek_v3 = "deepseek-ai/DeepSeek-V3"
    qwen_7b = "Qwen/Qwen2.5-7B-Instruct"
    glm4_9b = "THUDM/glm-4-9b-chat"

class TextInput(BaseModel):
    user_id: UUID
    text: str = Field(..., min_length=1)
    model: ModelChoice = Field(ModelChoice.deepseek_v3, description="要使用的模型标识")

# 新增：用于接收文本和Prompt的模型
class PromptTextInput(BaseModel):
    user_id: UUID
    text: str
    prompt: str
    model: ModelChoice = Field(ModelChoice.deepseek_v3, description="要使用的模型标识")

class JsonInputWithModel(BaseModel):
    user_id: UUID
    model: ModelChoice = Field(ModelChoice.deepseek_v3, description="要使用的模型标识")
    data: Dict[str, Any]


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

class DocumentTypeEnum(str, Enum):
    resume             = "resume"
    personal_statement = "personal_statement"
    recommendation     = "recommendation"

class UserDocQuery(BaseModel):
    """用于需要用户ID的请求体的模式。"""
    user_id: uuid.UUID

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
    user_profile: Optional[str] = None

    model_config = {
        "from_attributes": True,
    }


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
    user_profile: Optional[str] = Field("", description="前端传入的用户Profile文本")

    model_config = {
        "populate_by_name": True
    }


class DocumentWithContent(BaseModel):
    """用于返回文档及其当前版本内容的模式。"""
    id: uuid.UUID
    user_id: uuid.UUID
    type: str # 直接使用 str，因为枚举对象无法直接JSON序列化
    current_version_id: Optional[uuid.UUID] = None
    content_md: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentListItem(BaseModel):
    """用于返回文档列表项的模式。"""
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    current_version_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
