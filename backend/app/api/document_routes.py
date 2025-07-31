from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import user_models, document_models
from app.services.auth import get_current_user_from_cookie, get_current_user, get_current_user_flexible, calculate_checksum
from typing import List, Optional
import uuid
from datetime import datetime

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
    if len(content) > 50000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content too long. Maximum 50000 characters allowed."
        )
    
    try:
        # 创建文档
        doc_type_enum = getattr(document_models.DocType, doc_type)
        content_format_enum = getattr(document_models.ContentFormat, content_format)
        
        document = document_models.Document(
            user_id=current_user.id,
            type=doc_type_enum.value,
            title=title,
            doc_metadata="{}"  # JSON as string for SQLite
        )
        
        db.add(document)
        db.flush()  # 获取文档ID
        
        # 创建第一个版本
        version = document_models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            content=content,
            content_format=content_format_enum.value,
            checksum_sha256=calculate_checksum(content),
            created_by=current_user.id,
            version_metadata="{}"  # JSON as string for SQLite
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
    if len(content) > 50000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content too long. Maximum 50000 characters allowed."
        )
    
    try:
        # 查找文档
        doc_type_enum = getattr(document_models.DocType, doc_type)
        document = db.query(document_models.Document).filter(
            document_models.Document.id == doc_id,
            document_models.Document.user_id == current_user.id,
            document_models.Document.type == doc_type_enum.value,
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
            content_format=content_format_enum.value,
            diff_from=latest_version.id if latest_version else None,
            checksum_sha256=calculate_checksum(content),
            created_by=current_user.id,
            version_metadata="{}"  # JSON as string for SQLite
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
            document_models.Document.id == doc_id,
            document_models.Document.user_id == current_user.id,
            document_models.Document.type == doc_type_enum.value,
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
            document_models.Document.type == doc_type_enum.value,
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

@router.post("/{doc_type}/history")
def get_document_history(
    doc_type: str,
    payload: dict,
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """获取文档历史版本列表"""
    # 验证文档类型
    valid_types = ["resume", "personal_statement", "recommendation"]
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Must be one of: {valid_types}"
        )
    
    try:
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required"
            )
        
        # 查找用户的文档
        doc_type_enum = getattr(document_models.DocType, doc_type)
        
        # 处理测试用户ID
        if user_id == "test-id":
            test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
            document = db.query(document_models.Document).filter(
                document_models.Document.user_id == test_user_uuid,
                document_models.Document.type == doc_type_enum.value,
                document_models.Document.deleted_at.is_(None)
            ).first()
        else:
            document = db.query(document_models.Document).filter(
                document_models.Document.user_id == user_id,
                document_models.Document.type == doc_type_enum.value,
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
        
        # 添加调试信息
        print(f"Found {len(versions)} versions for document {document.id}")
        for v in versions:
            print(f"Version {v.version_number}: {v.id}")
        
        return [
            {
                "id": str(v.id),
                "version_number": v.version_number,
                "created_at": v.created_at.isoformat(),
                "content_snippet": v.content[:200] + "..." if len(v.content) > 200 else v.content
            }
            for v in versions
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document history: {str(e)}"
        )

@router.get("/versions/{version_id}/content")
def get_version_content(
    version_id: str,
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """获取指定版本的完整内容"""
    try:
        print(f"Looking for version: {version_id}")
        version = db.query(document_models.DocumentVersion).filter(
            document_models.DocumentVersion.id == version_id,
            document_models.DocumentVersion.deleted_at.is_(None)
        ).first()
        
        if not version:
            print(f"Version {version_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Version not found"
            )
        
        print(f"Found version: {version.id}, document_id: {version.document_id}")
        
        # 检查权限（通过文档关联）
        # 处理测试用户
        if hasattr(current_user, 'id') and current_user.id == 'test-id':
            test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
            document = db.query(document_models.Document).filter(
                document_models.Document.id == version.document_id,
                document_models.Document.user_id == test_user_uuid
            ).first()
        else:
            document = db.query(document_models.Document).filter(
                document_models.Document.id == version.document_id,
                document_models.Document.user_id == current_user.id
            ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this version"
            )
        
        return {
            "id": str(version.id),
            "content": version.content
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get version content: {str(e)}"
        )

@router.delete("/versions/{version_id}/delete")
def delete_version(
    version_id: str,
    payload: dict,
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """删除指定版本"""
    try:
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required"
            )
        
        version = db.query(document_models.DocumentVersion).filter(
            document_models.DocumentVersion.id == version_id,
            document_models.DocumentVersion.deleted_at.is_(None)
        ).first()
        
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Version not found"
            )
        
        # 检查权限（通过文档关联）
        # 处理测试用户ID
        if user_id == "test-id":
            test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
            document = db.query(document_models.Document).filter(
                document_models.Document.id == version.document_id,
                document_models.Document.user_id == test_user_uuid
            ).first()
        else:
            document = db.query(document_models.Document).filter(
                document_models.Document.id == version.document_id,
                document_models.Document.user_id == user_id
            ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this version"
            )
        
        # 软删除版本
        version.deleted_at = datetime.utcnow()
        db.commit()
        
        return {"message": "Version deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete version: {str(e)}"
        )

@router.post("/{doc_type}/save")
def save_document(
    doc_type: str,
    payload: dict,
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """保存/更新文档"""
    # 验证文档类型
    valid_types = ["resume", "personal_statement", "recommendation"]
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Must be one of: {valid_types}"
        )
    
    try:
        user_id = payload.get("user_id")
        content_md = payload.get("content_md", "")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required"
            )
        
        # 检查是否已存在该用户的该类型文档
        doc_type_enum = getattr(document_models.DocType, doc_type)
        
        # 处理测试用户ID
        if user_id == "test-id":
            # 对于测试用户，使用一个固定的UUID字符串
            test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
            existing_doc = db.query(document_models.Document).filter(
                document_models.Document.user_id == test_user_uuid,
                document_models.Document.type == doc_type_enum.value,
                document_models.Document.deleted_at.is_(None)
            ).first()
        else:
            existing_doc = db.query(document_models.Document).filter(
                document_models.Document.user_id == user_id,
                document_models.Document.type == doc_type_enum.value,
                document_models.Document.deleted_at.is_(None)
            ).first()
        
        if existing_doc:
            # 更新现有文档
            # 创建新版本
            latest_version = db.query(document_models.DocumentVersion).filter(
                document_models.DocumentVersion.document_id == existing_doc.id,
                document_models.DocumentVersion.deleted_at.is_(None)
            ).order_by(document_models.DocumentVersion.version_number.desc()).first()
            
            new_version_number = (latest_version.version_number + 1) if latest_version else 1
            
            # 处理测试用户ID
            if user_id == "test-id":
                test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
                new_version = document_models.DocumentVersion(
                    document_id=existing_doc.id,
                    version_number=new_version_number,
                    content=content_md,
                    content_format=document_models.ContentFormat.markdown.value,
                    checksum_sha256=calculate_checksum(content_md),
                    created_by=test_user_uuid,
                    version_metadata="{}"
                )
            else:
                new_version = document_models.DocumentVersion(
                    document_id=existing_doc.id,
                    version_number=new_version_number,
                    content=content_md,
                    content_format=document_models.ContentFormat.markdown.value,
                    checksum_sha256=calculate_checksum(content_md),
                    created_by=user_id,
                    version_metadata="{}"
                )
            
            db.add(new_version)
            db.flush()
            
            # 更新文档的当前版本
            existing_doc.current_version_id = new_version.id
            existing_doc.updated_at = datetime.utcnow()
            
            db.commit()
            
            return {
                "id": str(existing_doc.id),
                "user_id": user_id,
                "type": doc_type,
                "current_version_id": str(new_version.id),
                "content_md": content_md,
                "created_at": existing_doc.created_at.isoformat(),
                "updated_at": existing_doc.updated_at.isoformat()
            }
        else:
            # 创建新文档
            # 处理测试用户ID
            if user_id == "test-id":
                test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
                document = document_models.Document(
                    user_id=test_user_uuid,
                    type=doc_type_enum.value,
                    title=f"{doc_type.title()} Document",
                    doc_metadata="{}"
                )
            else:
                document = document_models.Document(
                    user_id=user_id,
                    type=doc_type_enum.value,
                    title=f"{doc_type.title()} Document",
                    doc_metadata="{}"
                )
            
            db.add(document)
            db.flush()
            
            # 创建第一个版本
            # 处理测试用户ID
            if user_id == "test-id":
                test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
                version = document_models.DocumentVersion(
                    document_id=document.id,
                    version_number=1,
                    content=content_md,
                    content_format=document_models.ContentFormat.markdown.value,
                    checksum_sha256=calculate_checksum(content_md),
                    created_by=test_user_uuid,
                    version_metadata="{}"
                )
            else:
                version = document_models.DocumentVersion(
                    document_id=document.id,
                    version_number=1,
                    content=content_md,
                    content_format=document_models.ContentFormat.markdown.value,
                    checksum_sha256=calculate_checksum(content_md),
                    created_by=user_id,
                    version_metadata="{}"
                )
            
            db.add(version)
            db.flush()
            
            # 设置当前版本
            document.current_version_id = version.id
            
            db.commit()
            
            return {
                "id": str(document.id),
                "user_id": user_id,
                "type": doc_type,
                "current_version_id": str(version.id),
                "content_md": content_md,
                "created_at": document.created_at.isoformat(),
                "updated_at": document.updated_at.isoformat()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save document: {str(e)}"
        ) 