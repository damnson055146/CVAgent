from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class DocType(enum.Enum):
    resume = "resume"
    personal_statement = "personal_statement"
    recommendation = "recommendation"

class ContentFormat(enum.Enum):
    markdown = "markdown"
    html = "html"
    plain = "plain"

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(ENUM(DocType), nullable=False, default=DocType.resume)
    title = Column(String, nullable=False, default="")
    current_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id", ondelete="SET NULL"), nullable=True)
    doc_metadata = Column("metadata", JSONB, nullable=False, default=dict)  # 使用name参数映射到metadata列
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    
    # 关系
    user = relationship("User", back_populates="documents")
    current_version = relationship("DocumentVersion", foreign_keys=[current_version_id])
    versions = relationship("DocumentVersion", back_populates="document", foreign_keys="DocumentVersion.document_id", cascade="all, delete-orphan")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    content_format = Column(ENUM(ContentFormat), nullable=False, default=ContentFormat.markdown)
    diff_from = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"), nullable=True)
    checksum_sha256 = Column(String, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    version_metadata = Column("metadata", JSONB, nullable=False, default=dict)  # 使用name参数映射到metadata列
    
    # 添加约束检查
    __table_args__ = (
        CheckConstraint("char_length(content) <= 5000", name="chk_content_len"),
    )
    
    # 关系
    document = relationship("Document", back_populates="versions", foreign_keys=[document_id])
    created_by_user = relationship("User", back_populates="document_versions", foreign_keys=[created_by])
    diff_from_version = relationship("DocumentVersion", remote_side=[id], foreign_keys=[diff_from]) 