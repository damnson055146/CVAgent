from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import user_models, document_models
from app.services.auth import get_current_user_from_cookie, get_current_user, get_current_user_flexible, calculate_checksum
from typing import List, Optional
import uuid

router = APIRouter()

@router.post("/upload")
def upload_document(
    doc_type: str = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    content_format: str = Form(default="markdown"),
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """上传新文档"""
    # 验证文档类型
    valid_types = ["resume", "personal_statement", "recommendation"]
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Must be one of: {valid_types}"
        )
    
    # 验证内容格式
    valid_formats = ["markdown", "html", "plain"]
    if content_format not in valid_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content format. Must be one of: {valid_formats}"
        )
    
    # 检查内容长度
    if len(content) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content too long. Maximum 5000 characters allowed."
        )
    
    try:
        # 创建文档
        doc_type_enum = getattr(document_models.DocType, doc_type)
        content_format_enum = getattr(document_models.ContentFormat, content_format)
        
        document = document_models.Document(
            user_id=current_user.id,
            type=doc_type_enum,
            title=title,
            doc_metadata={}  # 使用新的字段名
        )
        
        db.add(document)
        db.flush()  # 获取文档ID
        
        # 创建第一个版本
        version = document_models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            content=content,
            content_format=content_format_enum,
            checksum_sha256=calculate_checksum(content),
            created_by=current_user.id,
            version_metadata={}  # 使用新的字段名
        )
        
        db.add(version)
        db.flush()  # 获取版本ID
        
        # 设置当前版本
        document.current_version_id = version.id
        
        db.commit()
        
        return {
            "id": str(document.id),
            "title": document.title,
            "type": document.type.value,
            "current_version_id": str(version.id),
            "created_at": document.created_at.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document: {str(e)}"
        )

@router.post("/{doc_type}/{doc_id}/versions")
def add_document_version(
    doc_type: str,
    doc_id: str,
    content: str = Form(...),
    content_format: str = Form(default="markdown"),
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """为文档添加新版本"""
    # 验证文档类型
    valid_types = ["resume", "personal_statement", "recommendation"]
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Must be one of: {valid_types}"
        )
    
    # 验证内容格式
    valid_formats = ["markdown", "html", "plain"]
    if content_format not in valid_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content format. Must be one of: {valid_formats}"
        )
    
    # 检查内容长度
    if len(content) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content too long. Maximum 5000 characters allowed."
        )
    
    try:
        # 查找文档
        doc_type_enum = getattr(document_models.DocType, doc_type)
        document = db.query(document_models.Document).filter(
            document_models.Document.id == uuid.UUID(doc_id),
            document_models.Document.user_id == current_user.id,
            document_models.Document.type == doc_type_enum,
            document_models.Document.deleted_at.is_(None)
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # 获取下一个版本号
        latest_version = db.query(document_models.DocumentVersion).filter(
            document_models.DocumentVersion.document_id == document.id,
            document_models.DocumentVersion.deleted_at.is_(None)
        ).order_by(document_models.DocumentVersion.version_number.desc()).first()
        
        next_version_number = (latest_version.version_number + 1) if latest_version else 1
        
        # 创建新版本
        content_format_enum = getattr(document_models.ContentFormat, content_format)
        version = document_models.DocumentVersion(
            document_id=document.id,
            version_number=next_version_number,
            content=content,
            content_format=content_format_enum,
            diff_from=latest_version.id if latest_version else None,
            checksum_sha256=calculate_checksum(content),
            created_by=current_user.id,
            version_metadata={}  # 使用新的字段名
        )
        
        db.add(version)
        db.flush()
        
        # 更新文档的当前版本
        document.current_version_id = version.id
        
        db.commit()
        
        return {
            "id": str(version.id),
            "version_number": version.version_number,
            "content": version.content,
            "content_format": version.content_format.value,
            "created_at": version.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create version: {str(e)}"
        )

@router.get("/{doc_type}/{doc_id}")
def get_document_detail(
    doc_type: str,
    doc_id: str,
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """获取文档详情"""
    # 验证文档类型
    valid_types = ["resume", "personal_statement", "recommendation"]
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Must be one of: {valid_types}"
        )
    
    try:
        doc_type_enum = getattr(document_models.DocType, doc_type)
        document = db.query(document_models.Document).filter(
            document_models.Document.id == uuid.UUID(doc_id),
            document_models.Document.user_id == current_user.id,
            document_models.Document.type == doc_type_enum,
            document_models.Document.deleted_at.is_(None)
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # 获取所有版本
        versions = db.query(document_models.DocumentVersion).filter(
            document_models.DocumentVersion.document_id == document.id,
            document_models.DocumentVersion.deleted_at.is_(None)
        ).order_by(document_models.DocumentVersion.version_number.desc()).all()
        
        return {
            "id": str(document.id),
            "title": document.title,
            "type": document.type.value,
            "current_version_id": str(document.current_version_id) if document.current_version_id else None,
            "created_at": document.created_at.isoformat(),
            "updated_at": document.updated_at.isoformat(),
            "versions": [
                {
                    "id": str(v.id),
                    "version_number": v.version_number,
                    "content": v.content,
                    "content_format": v.content_format.value,
                    "created_at": v.created_at.isoformat()
                }
                for v in versions
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document: {str(e)}"
        )

@router.get("/{doc_type}")
def get_documents_by_type(
    doc_type: str,
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """获取用户的所有指定类型文档"""
    # 验证文档类型
    valid_types = ["resume", "personal_statement", "recommendation"]
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Must be one of: {valid_types}"
        )
    
    try:
        doc_type_enum = getattr(document_models.DocType, doc_type)
        documents = db.query(document_models.Document).filter(
            document_models.Document.user_id == current_user.id,
            document_models.Document.type == doc_type_enum,
            document_models.Document.deleted_at.is_(None)
        ).order_by(document_models.Document.updated_at.desc()).all()
        
        return [
            {
                "id": str(doc.id),
                "title": doc.title,
                "type": doc.type.value,
                "current_version_id": str(doc.current_version_id) if doc.current_version_id else None,
                "created_at": doc.created_at.isoformat(),
                "updated_at": doc.updated_at.isoformat()
            }
            for doc in documents
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get documents: {str(e)}"
        )


