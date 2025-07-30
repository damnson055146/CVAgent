from sqlalchemy import Column, String, Boolean, DateTime, Integer, SmallInteger, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, CITEXT
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    email = Column(CITEXT(), nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    status = Column(SmallInteger, nullable=False, default=1)
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    user_meta = Column("user_metadata", JSONB, nullable=False, default=dict)  # 使用name参数映射到user_metadata列
    username = Column(CITEXT(), nullable=True, index=True)
    refresh_token = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # 添加约束检查
    __table_args__ = (
        CheckConstraint("char_length(password_hash) BETWEEN 40 AND 255", name="users_password_hash_check"),
        CheckConstraint("role IN ('guest','vvip','consultant','etc..')", name="users_role_check"),
        CheckConstraint("status IN (0,1,2)", name="users_status_check"),
    )
    
    # 反向关系
    documents = relationship("Document", back_populates="user")
    document_versions = relationship("DocumentVersion", back_populates="created_by_user") 