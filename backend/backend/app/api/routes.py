import json
import fitz # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import Response, JSONResponse
from fastapi.concurrency import run_in_threadpool
from typing import Dict, Any
from datetime import datetime
import uuid

from app.models.schemas import TextInput, NewResumeProfile, PromptTextInput
from app.services.dify_client import dify_client

# 本地缓存存储
local_cache = {}

router = APIRouter()


@router.post("/parse-resume/")
async def parse_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="无效的文件类型，请上传PDF。")
    try:
        pdf_bytes = await file.read()
        extracted_text = "".join(page.get_text() for page in fitz.open(stream=pdf_bytes, filetype="pdf"))
        if not extracted_text.strip():
            raise ValueError("无法从PDF中提取任何文本。")

        result = await run_in_threadpool(dify_client.parse_text, extracted_text)
        if "error" in result:
            raise HTTPException(status_code=502, detail=result["error"])
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-resume-text/")
async def parse_resume_text(input_data: TextInput):
    result = await run_in_threadpool(dify_client.parse_text, input_data.text)
    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"])
    return JSONResponse(content=result)


@router.post("/optimize-text/")
async def rewrite_text(input_data: TextInput):
    result = await run_in_threadpool(dify_client.rewrite_text, input_data.text)
    return JSONResponse(content={"rewritten_text": result})


@router.post("/expand-text/")
async def expand_text(input_data: TextInput):
    result = await run_in_threadpool(dify_client.expand_text, input_data.text)
    return JSONResponse(content={"expanded_text": result})


@router.post("/contract-text/")
async def contract_text(input_data: TextInput):
    result = await run_in_threadpool(dify_client.contract_text, input_data.text)
    return JSONResponse(content={"contracted_text": result})


@router.post("/evaluate-resume/")
async def process_json_to_text(input_data: Dict[str, Any]):
    json_as_text = json.dumps(input_data, indent=2, ensure_ascii=False)
    result = await run_in_threadpool(dify_client.process_json_as_text, json_as_text)
    return JSONResponse(content={"processed_text": result})


@router.post("/modified-text-prompt/")
async def generate_with_prompt(input_data: PromptTextInput):
    """
    接收文本和自定义提示，调用Dify生成文本，并以指定格式返回。
    """
    try:
        generated_text = await run_in_threadpool(
            dify_client.generate_with_prompt,
            text=input_data.text,
            prompt=input_data.prompt
        )
        return JSONResponse(content={"modified_text": generated_text})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成文本时发生内部错误: {e}")


@router.post("/generate_statement/")
async def generate_statement(input_data: TextInput):
    """
    接收包含个人陈述相关信息的文本，调用 Dify 生成个人陈述。
    """
    try:
        # dify_client.generate_statement 返回一个 JSON 格式的字符串
        statement_text = await run_in_threadpool(dify_client.generate_statement,input_data.text)

        # 1. 清理可能存在的 ```json ``` 包裹（如果有）
        clean = statement_text
        if clean.startswith("```"):
            clean = clean.strip("`").strip("json").strip()

        # 2. 把 JSON 字符串转成 dict
        statement_dict = json.loads(clean)

        # 3. 直接返回 dict，FastAPI 会自动序列化为 JSON
        return statement_dict
        # return {"personal_statement": statement_dict}    #包在一个字段里返回

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="生成的个人陈述不是有效的 JSON，解析失败"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成个人陈述时发生内部错误: {e}"
        )

@router.post("/generate_recommendation/")
async def generate_recommendation(input_data: TextInput):
    """
    接收生成推荐信所需的信息文本，调用Dify并返回其生成的JSON结构。
    """
    try:
        recommendation_json = await run_in_threadpool(dify_client.generate_recommendation, input_data.text)
        if "error" in recommendation_json:
            raise HTTPException(status_code=502, detail=recommendation_json["error"])
        return JSONResponse(content=recommendation_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成推荐信时发生内部错误: {e}")


@router.post("/name-document/")
async def name_document(input_data: TextInput):
    """
    接收Markdown格式的文本，调用Dify为其生成一个合适的标题。
    """
    try:
        document_name = await run_in_threadpool(dify_client.name_document, input_data.text)
        return JSONResponse(content={"document_name": document_name})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"为文档命名时发生内部错误: {e}")

# 本地缓存API
@router.post("/api/documents_save/{doc_type}")
async def save_document_endpoint(doc_type: str, payload: Dict[str, Any]):
    """
    保存文档到本地缓存
    """
    # 硬编码UID
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    
    doc_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())
    
    # 保存到本地缓存
    local_cache[doc_id] = {
        "id": doc_id,
        "user_id": user_id,
        "type": doc_type,
        "current_version_id": version_id,
        "content_md": payload.get("content_md", ""),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "version_id": version_id
    }
    
    return {
        "id": doc_id,
        "user_id": user_id,
        "type": doc_type,
        "current_version_id": version_id,
        "content_md": payload.get("content_md", ""),
        "created_at": local_cache[doc_id]["created_at"],
        "updated_at": local_cache[doc_id]["updated_at"],
    }


@router.post("/api/documents/{doc_type}")
async def get_current_document(doc_type: str, payload: Dict[str, Any]):
    """
    从本地缓存获取文档
    """
    # 硬编码UID
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    
    # 查找用户的文档
    for doc_id, doc_data in local_cache.items():
        if doc_data["user_id"] == user_id and doc_data["type"] == doc_type:
            return {
                "id": doc_data["id"],
                "user_id": doc_data["user_id"],
                "type": doc_data["type"],
                "current_version_id": doc_data["current_version_id"],
                "content_md": doc_data["content_md"],
                "created_at": doc_data["created_at"],
                "updated_at": doc_data["updated_at"],
            }
    
    raise HTTPException(404, "Document not found")


