
import uuid
from uuid import UUID
from fastapi import FastAPI, Depends, HTTPException, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import model, crud, schemas
from app.api import routes

model.Base.metadata.create_all(bind=engine)

# 数据库表初始化
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Backend API",
    description="一个结构清晰、模块化的API服务，提供留学平台的所有后端服务。"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/", tags=["Health Check"])
def read_root():
    """
    根路径健康检查接口。
    """
    return {"status": "ok", "message": "API服务已成功启动！"}


#用户注册api
@app.post(
  "/api/users",
  response_model=schemas.UserResponse,
  status_code=201
)
def create_user_endpoint(
  payload: schemas.UserCreate,
  db: Session = Depends(get_db)
):
    # 可选：检查 email 是否已存在
    exists = db.query(model.User).filter_by(email=payload.email).first()
    if exists:
        raise HTTPException(400, "Email already registered")
    return crud.create_user(db, payload)

#用户登录api
@app.post(
    "/api/users/login",
    response_model=schemas.TokenResponse,
    status_code=200
)
def login_endpoint(
    payload: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    user = crud.authenticate_user(db, payload.email, payload.password_hash)
    if not user:
        # 认证失败，返回 401
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # 返回 token
    return {"access_token": user.id, "token_type": "bearer"}
    # return {"access_token": user.refresh_token, "token_type": "bearer"}

#上传文件api
@app.post(
  "/api/documents_save/{doc_type}",
  response_model=schemas.DocumentWithContent,
  status_code=200
)
def save_document_endpoint(
    doc_type: schemas.DocumentTypeEnum = Path(..., description="resume|personal_statement|recommendation"),
    payload: schemas.DocumentSave = Body(...),
    db: Session = Depends(get_db)
):
    doc, ver = crud.save_document(db, payload, doc_type)

    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "type": doc.type,
        "current_version_id": doc.current_version_id,
        "content_md": ver.content,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }

#请求最新版本文件api
@app.post(
  "/api/documents/{doc_type}",
  response_model=schemas.DocumentWithContent  # 之前定义过的带 content_md 的 schema
)
def get_current_document(
    payload: schemas.UserDocQuery,
    doc_type: schemas.APIDocType = Path(..., description="resume|personal_statement|recommendation"),
    db: Session = Depends(get_db)
):
    result = crud.get_current_doc_with_content(db, payload.user_id, doc_type)
    if not result:
        raise HTTPException(404, "Document not found")
    doc, ver = result

    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "type": doc_type,               # 保持 API 返回的原始类型
        "current_version_id": doc.current_version_id,
        "content_md": ver.content,      # 模型里列叫 content
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


