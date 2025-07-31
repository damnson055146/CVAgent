import uuid
import datetime
from uuid import UUID
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, Body, Path
from typing import List # --- 新增导入 ---
from sqlalchemy.orm import Session, joinedload

from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.api.document_routes import router as document_router
from app.models import user_models, document_models
from app.database import get_db, Base, engine,SessionLocal
from app.models import schemas
from app import crud # <--- 导入新的 crud 模块


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="CV Agent API", version="1.0.0")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(document_router, prefix="/documents", tags=["documents"])

# 创建数据库表
user_models.Base.metadata.create_all(bind=engine)
document_models.Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"message": "CV Agent API is running!"}


#上传文件api
@app.post(
  "/api/documents/{doc_type}/save",
  response_model=schemas.DocumentWithContent,
  status_code=200,
  tags=["文档 (Documents)"] # 添加标签以便在API文档中分组
)
def save_document_endpoint(
    # 注意：APIDocType 定义在 schemas.py 中
    doc_type: schemas.APIDocType = Path(..., description="文档类型: resume, personal_statement, 或 recommendation"),
    payload: schemas.DocumentSave = Body(...),
    db: Session = Depends(get_db)
):
    """
    保存一个新的文档版本。如果文档是首次创建，会自动创建父文档记录。
    """
    doc, ver = crud.save_document(db, payload, doc_type)

    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "type": doc.type.value, # 从枚举中获取字符串值
        "current_version_id": doc.current_version_id,
        "content_md": ver.content,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


@app.post(
    "/api/documents/{doc_type}/history",
    response_model=List[schemas.DocumentVersionHistoryItem],
    tags=["文档 (Documents)"]
)
def get_document_history(
        payload: schemas.UserDocQuery,
        doc_type: schemas.APIDocType = Path(..., description="要查询的文档类型"),
        db: Session = Depends(get_db)
):
    """
    获取指定用户和文档类型的所有历史版本的简要列表。
    """
    # 关键改动：使用 document_models.Document 进行查询
    doc = db.query(document_models.Document).filter(
        document_models.Document.user_id == payload.user_id,
        document_models.Document.type == doc_type.value
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail=f"未能找到该用户的 '{doc_type.value}' 类型文档")

    history_list = []
    for version in doc.versions:
        snippet = (version.content[:100] + '...') if len(version.content) > 100 else version.content
        history_list.append(
            schemas.DocumentVersionHistoryItem(
                id=version.id,
                version_number=version.version_number,
                created_at=version.created_at,
                content_snippet=snippet,
            )
        )
    return history_list


@app.get(
    "/api/versions/{version_id}/content",
    response_model=schemas.DocumentVersionContent,
    tags=["版本 (Versions)"]
)
def get_version_content(
        version_id: uuid.UUID = Path(..., description="要获取其内容的目标版本ID"),
        db: Session = Depends(get_db)
):
    """
    根据一个具体的版本ID，获取该版本的完整内容。
    """
    # 关键改动：使用 document_models.DocumentVersion 进行查询
    version = db.query(document_models.DocumentVersion).filter(document_models.DocumentVersion.id == version_id).first()

    if not version:
        raise HTTPException(status_code=404, detail="未找到该版本")
    return version


@app.delete(
    "/api/versions/{version_id}/delete",
    status_code=204,
    tags=["版本 (Versions)"]
)
def delete_version(
        payload: schemas.UserDocQuery,
        version_id: uuid.UUID = Path(..., description="要删除的版本ID"),
        db: Session = Depends(get_db)
):
    """
    根据ID删除一个特定版本，并进行权限校验。
    """
    # 关键改动：使用 document_models 进行查询和预加载
    version_to_delete = db.query(document_models.DocumentVersion).options(
        joinedload(document_models.DocumentVersion.document)
    ).filter(document_models.DocumentVersion.id == version_id).first()

    if not version_to_delete:
        raise HTTPException(status_code=404, detail="未找到该版本")

    parent_document = version_to_delete.document
    if parent_document.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="无权操作：您没有权限删除此版本。")

    # ... (后续的删除和更新逻辑保持不变, 只需确保模型引用正确) ...
    was_current_version = (parent_document.current_version_id == version_to_delete.id)
    db.delete(version_to_delete)
    if was_current_version:
        new_latest_version = db.query(document_models.DocumentVersion) \
            .filter(document_models.DocumentVersion.document_id == parent_document.id) \
            .order_by(document_models.DocumentVersion.version_number.desc()) \
            .first()
        parent_document.current_version_id = new_latest_version.id if new_latest_version else None
        db.add(parent_document)

    db.commit()
    return

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


