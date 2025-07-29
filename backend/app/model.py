import uuid
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    Integer,
    SmallInteger,
    String,
    Text,
    ForeignKey,
    func,
    text,
    Enum,
    DateTime,
    Boolean,
)
from sqlalchemy.dialects.postgresql import (
    UUID as PUUID,
    TIMESTAMP,
    CITEXT,
    JSONB,
)
from .database import Base


# 定义 User 模型，让 SQLAlchemy 确定 users
class User(Base):
    __tablename__ = "users"
    id                    = Column(
                              PUUID(as_uuid=True),
                              primary_key=True,
                              default=uuid.uuid4
                            )
    email                 = Column(CITEXT(), nullable=False, unique=True)
    password_hash         = Column(Text, nullable=False)
    role                  = Column(
                              String,
                              nullable=False,
                              server_default=text("'user'"),
                              default='user'
                            )
    status                = Column(
                              SmallInteger,
                              nullable=False,
                              server_default=text('1'),
                              default=1
                            )
    failed_login_attempts = Column(
                              Integer,
                              nullable=False,
                              server_default=text('0'),
                              default=0
                            )
    locked_until          = Column(TIMESTAMP(timezone=True), nullable=True)
    last_login_at         = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at            = Column(
                              TIMESTAMP(timezone=True),
                              nullable=False,
                              server_default=func.now()
                            )
    updated_at            = Column(
                              TIMESTAMP(timezone=True),
                              nullable=False,
                              server_default=func.now(),
                              onupdate=func.now()
                            )
    deleted_at            = Column(TIMESTAMP(timezone=True), nullable=True)
    user_metadata = Column(
        "user_metadata",           # ← 数据库里列名
        JSONB(),              # ← 类型
        nullable=False,
        server_default=text("'{}'::jsonb"),
        default=dict
    )

# --- 文档类型枚举 ---
class DocumentType(PyEnum):
    resume             = "resume"
    personal_statement = "personal_statement"
    recommendation     = "recommendation"

# --- documents 表 ---
class Document(Base):
    __tablename__ = "documents"
    id                 = Column(
        PUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id            = Column(
        PUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    type               = Column(
        Enum(DocumentType, name="doc_type", native_enum=True),
        nullable=False
    )
    current_version_id = Column(
        PUUID(as_uuid=True),
        ForeignKey("document_versions.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at         = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at         = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

# --- document_versions 表 ---
class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id             = Column(
        PUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    document_id    = Column(
        PUUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    version_number = Column(Integer, nullable=False)
    content     = Column(Text, nullable=False)
    created_by     = Column(
        PUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    created_at     = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False
    )