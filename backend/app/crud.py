import uuid
from sqlalchemy.orm import Session

# 导入分离的模型和模式
from app.models import document_models, user_models,schemas



def save_document(
        db: Session,
        payload: schemas.DocumentSave,
        doc_type: schemas.APIDocType
) -> tuple[document_models.Document, document_models.DocumentVersion]:
    """
    保存一个新的文档版本。如果文档不存在，则先创建文档。
    """
    # 1. 查找或创建父文档
    doc = (
        db.query(document_models.Document)
        .filter_by(user_id=payload.user_id, type=doc_type.value)
        .first()
    )

    if not doc:
        doc = document_models.Document(
            user_id=payload.user_id,
            type=doc_type.value,
            title=f"{doc_type.value.capitalize()} for user {payload.user_id}"  # 可以设置一个默认标题
        )
        db.add(doc)
        db.flush()  # 刷新以获取 doc.id

    # 2. 计算下一个版本号（排除已删除的版本）
    # 注意：在高并发场景下，这里可能需要更健壮的逻辑
    count = (
        db.query(document_models.DocumentVersion)
        .filter(
            document_models.DocumentVersion.document_id == doc.id,
            document_models.DocumentVersion.deleted_at.is_(None)
        )
        .count()
    )
    next_ver = count + 1

    # 3. 创建并插入新版本
    ver = document_models.DocumentVersion(
        document_id=doc.id,
        version_number=next_ver,
        content=payload.content_md,
        user_profile=payload.user_profile,
        created_by=payload.user_id
    )
    db.add(ver)
    db.flush()  # 刷新以获取 ver.id

    # 4. 更新文档的 current_version_id
    doc.current_version_id = ver.id
    db.add(doc)

    # 5. 提交事务
    db.commit()
    db.refresh(doc)
    db.refresh(ver)

    return doc, ver


def save_document_by_id(
        db: Session,
        doc_id: uuid.UUID,
        payload: schemas.DocumentSave
) -> tuple[document_models.Document, document_models.DocumentVersion]:
    """
    根据文档ID保存一个新的文档版本。
    在数据库的documents表里找到对应的id并查找和更新行的相关信息，
    最后把上传的内容存到document_versions表里。
    """
    # 1. 查找指定的文档
    doc = (
        db.query(document_models.Document)
        .filter_by(id=doc_id)
        .first()
    )

    if not doc:
        raise ValueError(f"文档ID {doc_id} 不存在")

    # 检查文档是否已被软删除
    if doc.deleted_at is not None:
        raise ValueError(f"文档ID {doc_id} 已被删除")

    # 验证用户权限（可选：确保用户只能修改自己的文档）
    if doc.user_id != payload.user_id:
        raise ValueError("用户无权修改此文档")

    # 2. 计算下一个版本号（排除已删除的版本）
    count = (
        db.query(document_models.DocumentVersion)
        .filter(
            document_models.DocumentVersion.document_id == doc.id,
            document_models.DocumentVersion.deleted_at.is_(None)
        )
        .count()
    )
    next_ver = count + 1

    # 3. 创建并插入新版本
    ver = document_models.DocumentVersion(
        document_id=doc.id,
        version_number=next_ver,
        content=payload.content_md,
        user_profile=payload.user_profile,
        created_by=payload.user_id
    )
    db.add(ver)
    db.flush()  # 刷新以获取 ver.id

    # 4. 更新文档的 current_version_id 和 updated_at
    doc.current_version_id = ver.id
    db.add(doc)

    # 5. 提交事务
    db.commit()
    db.refresh(doc)
    db.refresh(ver)

    return doc, ver


def get_document_history_by_id(
        db: Session,
        doc_id: uuid.UUID,
        user_id: uuid.UUID
) -> list[document_models.DocumentVersion]:
    """
    根据文档ID获取文档的历史版本列表。
    在数据库的documents表里找到对应的id并查找document_versions表里的外键documents_id为id的数据。
    只返回未被软删除的版本。
    """
    # 1. 查找指定的文档
    doc = (
        db.query(document_models.Document)
        .filter_by(id=doc_id)
        .first()
    )

    if not doc:
        raise ValueError(f"文档ID {doc_id} 不存在")

    # 检查文档是否已被软删除
    if doc.deleted_at is not None:
        raise ValueError(f"文档ID {doc_id} 已被删除")

    # 验证用户权限（确保用户只能查看自己的文档）
    if doc.user_id != user_id:
        raise ValueError("用户无权查看此文档")

    # 2. 查找document_versions表里的外键documents_id为id的数据，排除已删除的版本
    versions = (
        db.query(document_models.DocumentVersion)
        .filter(
            document_models.DocumentVersion.document_id == doc_id,
            document_models.DocumentVersion.deleted_at.is_(None)
        )
        .order_by(document_models.DocumentVersion.version_number.desc())
        .all()
    )

    return versions


def create_document(
        db: Session,
        user_id: uuid.UUID,
        doc_type: str
) -> document_models.Document:
    """
    创建新的文档记录。
    向documents表插入一行数据，title和current_version_id都设为空。
    """
    # 验证文档类型
    valid_types = ["resume", "personal_statement", "recommendation"]
    if doc_type not in valid_types:
        raise ValueError(f"无效的文档类型: {doc_type}。有效类型: {valid_types}")
    
    # 创建新的文档记录
    doc = document_models.Document(
        user_id=user_id,
        type=doc_type,
        title="",  # 设为空
        current_version_id=None  # 设为空
    )
    
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    return doc


def get_user_documents_by_type(
        db: Session,
        user_id: uuid.UUID,
        doc_type: str
) -> list[document_models.Document]:
    """
    查询documents表中user_id为指定用户ID且type为指定类型的文档。
    返回这些行的相关信息。只返回未被软删除的文档。
    """
    # 验证文档类型
    valid_types = ["resume", "personal_statement", "recommendation"]
    if doc_type not in valid_types:
        raise ValueError(f"无效的文档类型: {doc_type}。有效类型: {valid_types}")
    
    # 查询documents表中user_id为指定用户ID且type为指定类型的文档，排除已删除的文档
    documents = (
        db.query(document_models.Document)
        .filter(
            document_models.Document.user_id == user_id,
            document_models.Document.type == doc_type,
            document_models.Document.deleted_at.is_(None)
        )
        .order_by(document_models.Document.created_at.desc())
        .all()
    )
    
    return documents