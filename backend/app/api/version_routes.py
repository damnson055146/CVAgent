from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import user_models, document_models
from app.services.auth import get_current_user_flexible
from datetime import datetime

router = APIRouter()

@router.get("/versions/{version_id}/content")
def get_version_content(
    version_id: str,
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """获取指定版本的完整内容"""
    try:
        print(f"Looking for version: {version_id}")
        print(f"Current user: {current_user}")
        print(f"Current user id: {getattr(current_user, 'id', 'NO_ID')}")
        
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
            print("Processing test user")
            test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
            document = db.query(document_models.Document).filter(
                document_models.Document.id == version.document_id,
                document_models.Document.user_id == test_user_uuid
            ).first()
        else:
            print(f"Processing regular user: {current_user.id}")
            document = db.query(document_models.Document).filter(
                document_models.Document.id == version.document_id,
                document_models.Document.user_id == current_user.id
            ).first()
        
        print(f"Found document: {document}")
        
        if not document:
            print("Permission denied: document not found for user")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this version"
            )
        
        print("Permission granted, returning content")
        return {
            "id": str(version.id),
            "content": version.content
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get version content: {str(e)}"
        )

@router.delete("/versions/{version_id}/delete")
def delete_version(
    version_id: str,
    payload: dict = Body(...),
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    """删除指定版本"""
    try:
        user_id = payload.get("user_id")
        print(f"Delete version request - version_id: {version_id}, user_id: {user_id}")
        print(f"Current user: {current_user}")
        
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
            print(f"Version {version_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Version not found"
            )
        
        print(f"Found version: {version.id}, document_id: {version.document_id}")
        
        # 检查权限（通过文档关联）
        # 处理测试用户ID
        if user_id == "test-id":
            print("Processing test user for delete")
            test_user_uuid = "550e8400-e29b-41d4-a716-446655440000"
            document = db.query(document_models.Document).filter(
                document_models.Document.id == version.document_id,
                document_models.Document.user_id == test_user_uuid
            ).first()
        else:
            print(f"Processing regular user for delete: {user_id}")
            document = db.query(document_models.Document).filter(
                document_models.Document.id == version.document_id,
                document_models.Document.user_id == user_id
            ).first()
        
        print(f"Found document for delete: {document}")
        
        if not document:
            print("Permission denied: document not found for user")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this version"
            )
        
        # 软删除版本
        version.deleted_at = datetime.utcnow()
        db.commit()
        
        print("Version deleted successfully")
        return {"message": "Version deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Unexpected error during delete: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete version: {str(e)}"
        ) 