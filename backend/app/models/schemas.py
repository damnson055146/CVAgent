

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

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