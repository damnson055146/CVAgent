import uuid
import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from app import model, schemas
from app.model import Document, DocumentVersion, User
from app.schemas import (
    DocumentSave,
    DocumentWithContent,
    DocumentTypeEnum,
    UserCreate,
    UserLogin,
    APIDocType,
)

# —— 映射表 —— #
API_TO_DB: dict[DocumentTypeEnum, str] = {
    DocumentTypeEnum.resume:             "resume",
    DocumentTypeEnum.personal_statement: "personal_statement",
    DocumentTypeEnum.recommendation:     "recommendation",
}

DB_TO_API: dict[str, DocumentTypeEnum] = {
    db_val: api_val for api_val, db_val in API_TO_DB.items()
}

def create_user(db: Session, user_in: schemas.UserCreate) -> model.User:
    u = model.User(
        email=user_in.email,
        password_hash=user_in.password_hash,
        role=user_in.role,
        status=user_in.status,
        failed_login_attempts=user_in.failed_login_attempts,
        locked_until=user_in.locked_until,
        last_login_at=user_in.last_login_at,
        deleted_at=user_in.deleted_at,
        metadata=user_in.user_metadata,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def authenticate_user(db: Session, email: str, password_hash: str) -> model.User | None:
    # 1) 按 email 查用户
    user = db.query(model.User).filter_by(email=email).first()
    if not user:
        return None

    # 2) 比对密码
    if user.password_hash != password_hash:
        return None

    # 3) 生成一个新的 refresh_token（或 access_token）
    token = str(uuid.uuid4())
    user.refresh_token = token
    user.last_login_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(user)
    return user

def save_document(
    db: Session,
    payload: DocumentSave,
    doc_type: DocumentTypeEnum
) -> tuple[Document, DocumentVersion]:
    # 1) 映射到 DB enum
    db_type = API_TO_DB[doc_type]

    # 2) 查询 documents
    doc = (
        db.query(Document)
          .filter_by(user_id=payload.user_id, type=db_type)
          .first()
    )
    if not doc:
        doc = Document(
            id=uuid.uuid4(),
            user_id=payload.user_id,
            type=db_type,
            current_version_id=None
        )
        db.add(doc)
        db.flush()

    # 3) 下一个版本号
    count = (
        db.query(DocumentVersion)
          .filter_by(document_id=doc.id)
          .count()
    )
    next_ver = count + 1

    # 4) 插入新版本
    ver = DocumentVersion(
        id=uuid.uuid4(),
        document_id=doc.id,
        version_number=next_ver,
        content=payload.content_md,
        created_by=payload.user_id
    )
    db.add(ver)
    db.flush()

    # 5) 更新 current_version_id
    doc.current_version_id = ver.id

    db.commit()
    db.refresh(doc)
    db.refresh(ver)

    return doc, ver

def get_current_doc_with_content(
    db: Session,
    user_id: UUID,
    api_type: APIDocType
):
    db_type = API_TO_DB[api_type]
    # 1) 找到 documents 记录
    doc = (
        db.query(Document)
          .filter(
             Document.user_id == user_id,
             Document.type    == db_type   # 用映射后的值
          )
          .first()
    )
    if not doc or not doc.current_version_id:
        return None

    # 2) 拿当前版本
    ver = (
        db.query(DocumentVersion)
          .filter(DocumentVersion.id == doc.current_version_id)
          .first()
    )
    if not ver:
        return None

    return doc, ver
