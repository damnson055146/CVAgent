import uuid
import datetime
from uuid import UUID
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, Body, Path
from typing import List # --- 新增导入 ---
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
import os
from dotenv import load_dotenv

from app.api.routes import router
from app.api.auth_routes import router as auth_router
# from app.api.document_routes import router as document_router
from app.models import user_models, document_models
from app.models.api_log_models import APILog
from app.database import get_db, Base, engine,SessionLocal
from app.models import schemas
from app import crud # <--- 导入新的 crud 模块

# 加载环境变量
load_dotenv()

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
app.include_router(router)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
# app.include_router(document_router, prefix="/documents", tags=["documents"])

# 创建数据库表
user_models.Base.metadata.create_all(bind=engine)
document_models.Base.metadata.create_all(bind=engine)
APILog.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"message": "CV Agent API is running!"}

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "CV Agent API"}


#按类型创建文档
@app.post(
    "/api/documents/{doc_type}/create",
    response_model=schemas.DocumentWithContent,
    status_code=201,
    tags=["文档 (Documents)"]
)
def create_document_endpoint(
    doc_type: str = Path(..., description="文档类型: resume, personal_statement, 或 recommendation"),
    payload: schemas.UserDocQuery = Body(...),
    db: Session = Depends(get_db)
):
    """
    创建新的文档记录。
    向documents表插入一行数据，title和current_version_id都设为空。
    """
    try:
        doc = crud.create_document(db, payload.user_id, doc_type)
        
        return {
            "id": doc.id,
            "user_id": doc.user_id,
            "type": doc.type.value, # 从枚举中获取字符串值
            "current_version_id": doc.current_version_id,
            "content_md": "",  # 新文档没有内容
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

#删除文档
@app.delete(
    "/api/documents/{doc_id}/delete",
    status_code=204,
    tags=["文档 (Documents)"]
)
def delete_document(
        doc_id: uuid.UUID = Path(..., description="要删除的文档ID"),
        payload: schemas.UserDocQuery = Body(...),
        db: Session = Depends(get_db)
):
    """
    根据ID软删除一个特定文档及其所有版本。
    软删除：将documents表的deleted_at设置为当前时间，同时软删除所有相关的document_versions记录。
    """
    import datetime

    # 查找文档
    document_to_delete = db.query(document_models.Document).filter(
        document_models.Document.id == doc_id
    ).first()

    if not document_to_delete:
        raise HTTPException(status_code=404, detail="未找到该文档")

    # 检查是否已经被软删除
    if document_to_delete.deleted_at is not None:
        raise HTTPException(status_code=400, detail="该文档已经被删除")

    # 验证用户权限
    if document_to_delete.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="无权操作：您没有权限删除此文档。")

    # 软删除文档：设置deleted_at为当前时间
    current_time = datetime.datetime.utcnow()
    document_to_delete.deleted_at = current_time

    # 软删除所有相关的版本
    versions_to_delete = db.query(document_models.DocumentVersion).filter(
        document_models.DocumentVersion.document_id == doc_id,
        document_models.DocumentVersion.deleted_at.is_(None)
    ).all()

    for version in versions_to_delete:
        version.deleted_at = current_time

    db.commit()
    return


# 读取 personal_statement_profiles 表，按创建时间降序返回 id, name, profile_md
@app.post(
    "/api/personal-statement-profiles",
    tags=["用户画像 (PersonalStatementProfiles)"]
)
def list_personal_statement_profiles(
    payload: dict = Body(..., example={"user_id": "00000000-0000-0000-0000-000000000000", "name": "张三"}),
    db: Session = Depends(get_db)
):
    # 校验 name
    name_value = str(payload.get("name", "")).strip()
    if not name_value:
        raise HTTPException(status_code=400, detail="name 不能为空")
    # 校验 user_id
    try:
        uid = UUID(str(payload.get("user_id")))
    except Exception:
        raise HTTPException(status_code=400, detail="user_id 非法")

    # 可选：验证用户是否存在且有效
    user = db.query(user_models.User).filter(
        user_models.User.id == uid,
        user_models.User.deleted_at.is_(None),
        user_models.User.is_active.is_(True)
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="无效或已禁用的用户")
    rows = db.execute(text(
        """
        SELECT id, name, profile_md
        FROM personal_statement_profiles
        WHERE user_id = :user_id AND name = :name
        ORDER BY created_at DESC
        """
    ), {"user_id": str(uid), "name": name_value}).mappings().all()
    return [{
        "id": str(r["id"]),
        "name": r.get("name"),
        "profile_md": r["profile_md"],
    } for r in rows]

#按类型获取文档列表
@app.post(
    "/api/documents/{doc_type}/history",
    response_model=List[schemas.DocumentListItem],
    tags=["文档 (Documents)"]
)
def get_user_documents_by_type(
        doc_type: str = Path(..., description="文档类型: resume, personal_statement, 或 recommendation"),
        payload: schemas.UserDocQuery = Body(...),
        db: Session = Depends(get_db)
):
    """
    查询documents表中user_id为前端返回的user_id的行，并把这些行的相关信息返回给前端。
    type从URL可以获取。
    """
    try:
        documents = crud.get_user_documents_by_type(db, payload.user_id, doc_type)

        document_list = []
        for doc in documents:
            document_list.append(
                schemas.DocumentListItem(
                    id=doc.id,
                    user_id=doc.user_id,
                    type=doc.type.value,
                    title=doc.title,
                    current_version_id=doc.current_version_id,
                    created_at=doc.created_at,
                    updated_at=doc.updated_at,
                )
            )
        return document_list
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


#上传文档保存至最新版本
@app.post(
  "/api/versions/{doc_id}/save",
  response_model=schemas.DocumentWithContent,
  status_code=200,
  tags=["文档 (Documents)"] # 添加标签以便在API文档中分组
)
def save_document_endpoint(
    doc_id: uuid.UUID = Path(..., description="要保存的文档ID"),
    payload: schemas.DocumentSave = Body(...),
    db: Session = Depends(get_db)
):
    """
    根据文档ID保存一个新的文档版本。
    在数据库的documents表里找到对应的id并查找和更新行的相关信息，
    最后把上传的内容存到document_versions表里。
    """
    try:
        doc, ver = crud.save_document_by_id(db, doc_id, payload)
        
        return {
            "id": doc.id,
            "user_id": doc.user_id,
            "type": doc.type.value, # 从枚举中获取字符串值
            "current_version_id": doc.current_version_id,
            "content_md": ver.content,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
        }
    except ValueError as e:
        if "已被删除" in str(e):
            raise HTTPException(status_code=410, detail=str(e))
        else:
            raise HTTPException(status_code=404, detail=str(e))

#按文档获取版本列表
@app.post(
    "/api/versions/{doc_id}/history",
    response_model=List[schemas.DocumentVersionHistoryItem],
    tags=["文档 (Documents)"]
)
def get_document_history(
        doc_id: uuid.UUID = Path(..., description="要查询的文档ID"),
        payload: schemas.UserDocQuery = Body(...),
        db: Session = Depends(get_db)
):
    """
    根据文档ID获取文档的历史版本列表。
    在数据库的documents表里找到对应的id并查找document_versions表里的外键documents_id为id的数据。
    只返回未被软删除的版本。
    """
    try:
        versions = crud.get_document_history_by_id(db, doc_id, payload.user_id)
        
        history_list = []
        for version in versions:
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
    except ValueError as e:
        if "已被删除" in str(e):
            raise HTTPException(status_code=410, detail=str(e))
        else:
            raise HTTPException(status_code=404, detail=str(e))


#按版本添加用户画像
@app.post(
    "/api/versions/{doc_id}/user_profile_save",
    status_code=200,
    tags=["版本 (Versions)"]
)
def save_user_profile_to_version(
        doc_id: uuid.UUID = Path(..., description="目标版本ID (document_versions.id)"),
        payload: dict = Body(..., example={"user_id": "<uuid>", "user_profile": "xxx"}),
        db: Session = Depends(get_db)
):
    """根据版本ID保存/更新 user_profile 字段。

    权限校验：payload.user_id 必须与 version.document.user_id 一致。
    """
    from sqlalchemy.orm import joinedload
    # 查找版本并关联父文档
    version = db.query(document_models.DocumentVersion).options(
        joinedload(document_models.DocumentVersion.document)
    ).filter(document_models.DocumentVersion.id == doc_id).first()

    if not version:
        raise HTTPException(status_code=404, detail="未找到该版本")

    # 检查版本是否被软删除
    if version.deleted_at is not None:
        raise HTTPException(status_code=410, detail="该版本已被删除")

    # 校验用户
    if str(version.document.user_id) != str(payload.get("user_id")):
        raise HTTPException(status_code=403, detail="无权操作：您没有权限修改此版本的用户画像")

    # 更新 user_profile
    version.user_profile = payload.get("user_profile", "")
    db.add(version)
    db.commit()
    db.refresh(version)

    return {"version_id": str(version.id), "user_profile": version.user_profile}

#按版本获取内容
@app.post(
    "/api/versions/{version_id}/content",
    response_model=schemas.DocumentVersionContent,
    tags=["版本 (Versions)"]
)
def get_version_content(
        version_id: uuid.UUID = Path(..., description="要获取其内容的目标版本ID"),
        payload: schemas.UserDocQuery = Body(...),
        db: Session = Depends(get_db)
):
    """
    根据一个具体的版本ID，获取该版本的完整内容。
    验证用户身份是否符合，并确保版本未被软删除。
    """
    # 查找版本并验证用户权限
    version = db.query(document_models.DocumentVersion).options(
        joinedload(document_models.DocumentVersion.document)
    ).filter(document_models.DocumentVersion.id == version_id).first()

    if not version:
        raise HTTPException(status_code=404, detail="未找到该版本")
    
    # 检查版本是否已被软删除
    if version.deleted_at is not None:
        raise HTTPException(status_code=404, detail="该版本已被删除")
    
    # 检查文档是否已被软删除
    if version.document.deleted_at is not None:
        raise HTTPException(status_code=410, detail="该文档已被删除")
    
    # 验证用户权限
    if version.document.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="无权操作：您没有权限查看此版本。")
    
    return version

#按版本删除
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
    根据ID软删除一个特定版本，并进行权限校验。
    软删除：将deleted_at设置为当前时间，而不是物理删除数据。
    """
    import datetime
    
    # 查找版本并预加载文档信息
    version_to_delete = db.query(document_models.DocumentVersion).options(
        joinedload(document_models.DocumentVersion.document)
    ).filter(document_models.DocumentVersion.id == version_id).first()

    if not version_to_delete:
        raise HTTPException(status_code=404, detail="未找到该版本")

    # 检查是否已经被软删除
    if version_to_delete.deleted_at is not None:
        raise HTTPException(status_code=400, detail="该版本已经被删除")

    parent_document = version_to_delete.document
    if parent_document.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="无权操作：您没有权限删除此版本。")

    # 软删除：设置deleted_at为当前时间
    version_to_delete.deleted_at = datetime.datetime.utcnow()
    
    # 如果删除的是当前版本，需要更新文档的current_version_id
    if parent_document.current_version_id == version_to_delete.id:
        # 查找最新的未删除版本
        new_latest_version = db.query(document_models.DocumentVersion) \
            .filter(
                document_models.DocumentVersion.document_id == parent_document.id,
                document_models.DocumentVersion.deleted_at.is_(None)
            ) \
            .order_by(document_models.DocumentVersion.version_number.desc()) \
            .first()
        parent_document.current_version_id = new_latest_version.id if new_latest_version else None
        db.add(parent_document)

    db.commit()
    return



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


