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
    # 确保user_id是UUID对象
    if isinstance(payload.user_id, str):
        user_id = uuid.UUID(payload.user_id)
    else:
        user_id = payload.user_id
    
    # 1. 查找或创建父文档
    doc = (
        db.query(document_models.Document)
        .filter_by(user_id=user_id, type=doc_type.value)
        .first()
    )

    if not doc:
        doc = document_models.Document(
            user_id=user_id,
            type=doc_type.value,
            title=f"{doc_type.value.capitalize()} for user {user_id}"  # 可以设置一个默认标题
        )
        db.add(doc)
        db.flush()  # 刷新以获取 doc.id

    # 2. 计算下一个版本号
    # 注意：在高并发场景下，这里可能需要更健壮的逻辑
    count = (
        db.query(document_models.DocumentVersion)
        .filter_by(document_id=doc.id)
        .count()
    )
    next_ver = count + 1

    # 3. 创建并插入新版本
    ver = document_models.DocumentVersion(
        document_id=doc.id,
        version_number=next_ver,
        content=payload.content_md,
        created_by=user_id
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