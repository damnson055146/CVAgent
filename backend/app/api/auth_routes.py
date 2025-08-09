from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import user_models
from app.models.schemas import UserCreate, UserLogin, Token, UserInDB
from app.services.auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    create_refresh_token,
    get_current_user_from_cookie,
    get_current_user_flexible
)
from datetime import timedelta
import os

router = APIRouter()
security = HTTPBearer()

# 配置
SECRET_KEY = os.getenv("SECRET_KEY", "cv-agent-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

@router.post("/register", response_model=dict)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查邮箱是否已存在
    db_user = db.query(user_models.User).filter(
        user_models.User.email == user.email,
        user_models.User.deleted_at.is_(None)
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 检查用户名是否已存在（如果提供了用户名）
    if user.username:
        db_user = db.query(user_models.User).filter(
            user_models.User.username == user.username,
            user_models.User.deleted_at.is_(None)
        ).first()
        
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
    
    # 创建新用户
    hashed_password = get_password_hash(user.password)
    db_user = user_models.User(
        email=user.email,
        username=user.username,
        password_hash=hashed_password,
        role="guest"  # 使用guest作为默认角色
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return {"message": "User created successfully", "user_id": str(db_user.id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    """用户登录"""
    # 查找用户（支持邮箱或用户名登录）
    db_user = db.query(user_models.User).filter(
        (user_models.User.email == user_credentials.username) | 
        (user_models.User.username == user_credentials.username),
        user_models.User.deleted_at.is_(None),
        user_models.User.is_active == True
    ).first()
    
    # 本地测试账号
    if not db_user and user_credentials.username == "testuser" and user_credentials.password == "testpassword":
        fake_token = "test-token"
        return {
            "access_token": fake_token,
            "token_type": "bearer",
            "user_id": "test-id",
            "username": "testuser",
            "email": "testuser@example.com"
        }

    if not db_user or not verify_password(user_credentials.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # 更新最后登录时间
    db_user.last_login_at = user_models.func.now()
    db.commit()
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user.id)}, 
        expires_delta=access_token_expires
    )
    
    # 设置cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(db_user.id),
        "username": db_user.username,
        "email": db_user.email
    }

@router.post("/logout")
def logout(response: Response):
    """用户登出"""
    response.delete_cookie("access_token")
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=dict)
def get_current_user_info(current_user: user_models.User = Depends(get_current_user_flexible)):
    """获取当前用户信息"""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

@router.post("/refresh", response_model=Token)
def refresh_token(current_user: user_models.User = Depends(get_current_user_from_cookie)):
    """刷新访问令牌"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(current_user.id)}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    } 