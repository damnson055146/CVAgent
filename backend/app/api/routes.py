import json
import fitz # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import Response, JSONResponse
from fastapi.concurrency import run_in_threadpool
from typing import Dict, Any
from datetime import datetime
import uuid

from app.models.schemas import TextInput, NewResumeProfile, PromptTextInput, JsonInputWithModel
from app.models import user_models
from app.services import siliconflow_client as sf_client
from app.models.api_log_models import APILog
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import UUID
from app.services.auth import get_current_user_flexible

# 本地缓存存储
local_cache = {}

router = APIRouter()


async def _ensure_user_exists(db: AsyncSession, user_id: UUID) -> None:
    from sqlalchemy import select
    result = await db.execute(
        select(user_models.User).where(
            user_models.User.id == user_id,
            user_models.User.deleted_at.is_(None),
            user_models.User.is_active.is_(True),
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or inactive user_id")


@router.post("/parse-resume/")
async def parse_resume(
    file: UploadFile = File(...),
    model: str = Form(...),
    current_user: user_models.User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="无效的文件类型，请上传PDF。")
    try:
        pdf_bytes = await file.read()
        extracted_text = "".join(page.get_text() for page in fitz.open(stream=pdf_bytes, filetype="pdf"))
        if not extracted_text.strip():
            raise ValueError("无法从PDF中提取任何文本。")

        content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._PARSE_RESUME_PROMPT, extracted_text, model, True)
        result = content
        if "error" in result:
            raise HTTPException(status_code=502, detail=result["error"])
        # log
        log = APILog(
            user_id=current_user.id,
            api_name="parse_resume",
            request_payload={"filename": file.filename, "model": model, "user_id": str(current_user.id)},
            system_prompt=meta.get("system_prompt"),
            model=meta.get("model"),
            prompt_tokens=meta.get("prompt_tokens"),
            completion_tokens=meta.get("completion_tokens"),
            total_tokens=meta.get("total_tokens"),
            response_text=json.dumps(result, ensure_ascii=False)
        )
        db.add(log)
        await db.commit()
        return JSONResponse(content=result)
    except Exception as e:
        try:
            db.add(APILog(
                user_id=getattr(current_user, 'id', None),
                api_name="parse_resume",
                request_payload={"filename": getattr(file, 'filename', None), "model": model, "user_id": str(getattr(current_user, 'id', '')) if getattr(current_user, 'id', None) else None},
                error=str(e)
            ))
            await db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-resume-text/")
async def parse_resume_text(input_data: TextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._PARSE_RESUME_PROMPT, input_data.text, input_data.model, True)
    result = content
    if "error" in result:
        raise HTTPException(status_code=502, detail=result)
    log = APILog(
        user_id=current_user.id,
        api_name="parse_resume_text",
        request_payload={"body": input_data.model_dump(mode="json")},
        system_prompt=meta.get("system_prompt"),
        model=meta.get("model"),
        prompt_tokens=meta.get("prompt_tokens"),
        completion_tokens=meta.get("completion_tokens"),
        total_tokens=meta.get("total_tokens"),
        response_text=json.dumps(result, ensure_ascii=False)
    )
    db.add(log)
    await db.commit()
    return JSONResponse(content=result)


@router.post("/optimize-text/")
async def rewrite_text(input_data: TextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._REWRITE_TEXT_PROMPT, input_data.text, input_data.model, False)
    db.add(APILog(
        user_id=current_user.id,
        api_name="optimize_text",
        request_payload={"body": input_data.model_dump(mode="json")},
        system_prompt=meta.get("system_prompt"),
        model=meta.get("model"),
        prompt_tokens=meta.get("prompt_tokens"),
        completion_tokens=meta.get("completion_tokens"),
        total_tokens=meta.get("total_tokens"),
        response_text=str(content) if isinstance(content, str) else None
    ))
    await db.commit()
    return JSONResponse(content={"rewritten_text": content})


@router.post("/expand-text/")
async def expand_text(input_data: TextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._EXPAND_TEXT_PROMPT, input_data.text, input_data.model, False)
    db.add(APILog(
        user_id=current_user.id,
        api_name="expand_text",
        request_payload={"body": input_data.model_dump(mode="json")},
        system_prompt=meta.get("system_prompt"),
        model=meta.get("model"),
        prompt_tokens=meta.get("prompt_tokens"),
        completion_tokens=meta.get("completion_tokens"),
        total_tokens=meta.get("total_tokens"),
        response_text=str(content) if isinstance(content, str) else None
    ))
    await db.commit()
    return JSONResponse(content={"expanded_text": content})


@router.post("/contract-text/")
async def contract_text(input_data: TextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._CONTRACT_TEXT_PROMPT, input_data.text, input_data.model, False)
    db.add(APILog(
        user_id=current_user.id,
        api_name="contract_text",
        request_payload={"body": input_data.model_dump(mode="json")},
        system_prompt=meta.get("system_prompt"),
        model=meta.get("model"),
        prompt_tokens=meta.get("prompt_tokens"),
        completion_tokens=meta.get("completion_tokens"),
        total_tokens=meta.get("total_tokens"),
        response_text=str(content) if isinstance(content, str) else None
    ))
    await db.commit()
    return JSONResponse(content={"contracted_text": content})


@router.post("/evaluate-resume/")
async def process_json_to_text(input_data: JsonInputWithModel, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    json_as_text = json.dumps(input_data.data, indent=2, ensure_ascii=False)
    content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._EVALUATE_RESUME_PROMPT, json_as_text, input_data.model, False)
    db.add(APILog(
        user_id=current_user.id,
        api_name="evaluate_resume",
        request_payload={"body": input_data.model_dump(mode="json")},
        system_prompt=meta.get("system_prompt"),
        model=meta.get("model"),
        prompt_tokens=meta.get("prompt_tokens"),
        completion_tokens=meta.get("completion_tokens"),
        total_tokens=meta.get("total_tokens"),
        response_text=str(content) if isinstance(content, str) else None
    ))
    await db.commit()
    return JSONResponse(content={"processed_text": content})


@router.post("/modified-text-prompt/")
async def generate_with_prompt(input_data: PromptTextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    """
    接收文本和自定义提示，调用SiliconFlow生成文本，并以指定格式返回。
    """
    try:
        content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, input_data.prompt, input_data.text, input_data.model, False)
        db.add(APILog(
            user_id=current_user.id,
            api_name="modified_text_prompt",
            request_payload={"body": input_data.model_dump(mode="json")},
            system_prompt=meta.get("system_prompt"),
            model=meta.get("model"),
            prompt_tokens=meta.get("prompt_tokens"),
            completion_tokens=meta.get("completion_tokens"),
            total_tokens=meta.get("total_tokens"),
            response_text=str(content) if isinstance(content, str) else None
        ))
        await db.commit()
        return JSONResponse(content={"modified_text": content})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成文本时发生内部错误: {e}")


@router.post("/generate-statement/")
async def generate_statement(input_data: TextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    """
    接收包含个人陈述相关信息的文本，调用 SiliconFlow 生成个人陈述。
    """
    try:
        content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._GENERATE_STATEMENT_PROMPT, input_data.text, input_data.model, True)
        statement_dict = content
        if "error" in statement_dict:
            raise HTTPException(status_code=502, detail=statement_dict["error"])

        # 规范化键名：将中文键名映射为英文键名
        if isinstance(statement_dict, dict):
            mapping_top = {
                "个人陈述": "personal_statement"
            }
            mapping_inner = {
                "开头与自我介绍与申请目标": "introduction_and_goals",
                "科研经历": "research_experience",
                "课外与领导": "activities_and_leadership",
                "职业规划": "career_plan",
                "择校理由": "reasons_for_school",
                "结尾": "conclusion",
            }
            normalized: Dict[str, Any] = {}
            for k, v in statement_dict.items():
                nk = (k.strip() if isinstance(k, str) else k)
                ek = mapping_top.get(nk, nk)
                if ek == "personal_statement" and isinstance(v, dict):
                    inner_norm: Dict[str, Any] = {}
                    for ik, iv in v.items():
                        ikn = (ik.strip() if isinstance(ik, str) else ik)
                        eik = mapping_inner.get(ikn, ikn)
                        inner_norm[eik] = iv
                    normalized[ek] = inner_norm
                else:
                    normalized[ek] = v
            statement_dict = normalized
        db.add(APILog(
            user_id=current_user.id,
            api_name="generate_statement",
            request_payload={"body": input_data.model_dump(mode="json")},
            system_prompt=meta.get("system_prompt"),
            model=meta.get("model"),
            prompt_tokens=meta.get("prompt_tokens"),
            completion_tokens=meta.get("completion_tokens"),
            total_tokens=meta.get("total_tokens"),
            response_text=json.dumps(statement_dict, ensure_ascii=False)
        ))
        await db.commit()
        return statement_dict
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成个人陈述时发生内部错误: {e}"
        )

@router.post("/generate-recommendation/")
async def generate_recommendation(input_data: TextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    """
    接收生成推荐信所需的信息文本，调用Dify并返回其生成的JSON结构。
    """
    try:
        content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._GENERATE_RECOMMENDATION_PROMPT, input_data.text, input_data.model, True)
        recommendation_json = content
        if "error" in recommendation_json:
            raise HTTPException(status_code=502, detail=recommendation_json["error"])
        db.add(APILog(
            user_id=current_user.id,
            api_name="generate_recommendation",
            request_payload={"body": input_data.model_dump(mode="json")},
            system_prompt=meta.get("system_prompt"),
            model=meta.get("model"),
            prompt_tokens=meta.get("prompt_tokens"),
            completion_tokens=meta.get("completion_tokens"),
            total_tokens=meta.get("total_tokens"),
            response_text=json.dumps(recommendation_json, ensure_ascii=False)
        ))
        await db.commit()
        return JSONResponse(content=recommendation_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成推荐信时发生内部错误: {e}")


@router.post("/version-name/")
async def name_document(input_data: TextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    """
    为版本生成名称（接收 Markdown 文本，调用模型产出名称）。
    """
    try:
        content, meta = await run_in_threadpool(sf_client._call_siliconflow_with_meta, sf_client._NAME_DOCUMENT_PROMPT, input_data.text, input_data.model, False)
        db.add(APILog(
            user_id=current_user.id,
            api_name="name_document",
            request_payload={"body": input_data.model_dump(mode="json")},
            system_prompt=meta.get("system_prompt"),
            model=meta.get("model"),
            prompt_tokens=meta.get("prompt_tokens"),
            completion_tokens=meta.get("completion_tokens"),
            total_tokens=meta.get("total_tokens"),
            response_text=str(content) if isinstance(content, str) else None
        ))
        await db.commit()
        return JSONResponse(content={"document_name": content})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"为文档命名时发生内部错误: {e}")



@router.post("/personal-statement-profile/")
async def personal_statement_profile(input_data: TextInput, current_user: user_models.User = Depends(get_current_user_flexible), db: AsyncSession = Depends(get_db)):
    """
    接收前端传入的 Markdown 内容（含个人陈述相关信息），并调用大模型生成用于撰写个人陈述的用户画像段落（Markdown）。
    同时将结果写入 personal_statement_profiles 表并记录 API 调用日志。
    请求体包含：user_id, text (markdown), model。
    返回：{ "profile_md": "..." }
    """
    try:
        content, meta = await run_in_threadpool(
            sf_client._call_siliconflow_with_meta,
            sf_client._GENERATE_PS_PROFILE_PROMPT,
            input_data.text,
            input_data.model,
            False
        )

        # 使用大模型从输入文本中提取姓名
        name_text, _ = await run_in_threadpool(
            sf_client._call_siliconflow_with_meta,
            sf_client._EXTRACT_NAME_PROMPT,
            input_data.text,
            input_data.model,
            False
        )
        extracted_name = (name_text or "").strip()
        # 简单清洗常见前缀
        for prefix in ["姓名：", "姓名:", "Name:", "name:"]:
            if extracted_name.startswith(prefix):
                extracted_name = extracted_name[len(prefix):].strip()
        # 判空/无效
        invalid_markers = {"", "未知", "不确定", "无", "N/A", "n/a", "null", "None"}
        if extracted_name in invalid_markers:
            raise HTTPException(status_code=400, detail="未检测到姓名信息，请补充姓名后重试")

        # 写入日志
        db.add(APILog(
            user_id=current_user.id,
            api_name="personal_statement_profile",
            request_payload={"body": input_data.model_dump(mode="json")},
            system_prompt=meta.get("system_prompt"),
            model=meta.get("model"),
            prompt_tokens=meta.get("prompt_tokens"),
            completion_tokens=meta.get("completion_tokens"),
            total_tokens=meta.get("total_tokens"),
            response_text=str(content) if isinstance(content, str) else None
        ))

        # 写入 personal_statement_profiles 表
        await db.execute(
            text("""
                INSERT INTO personal_statement_profiles (user_id, name, profile_md)
                VALUES (:user_id, :name, :profile_md)
            """),
            {"user_id": str(current_user.id), "name": extracted_name, "profile_md": content}
        )

        await db.commit()
        return JSONResponse(content={"name": extracted_name, "profile_md": content})
    except Exception as e:
        # 发生异常也尽可能记录日志
        try:
            db.add(APILog(
                user_id=current_user.id if hasattr(current_user, 'id') else None,
                api_name="personal_statement_profile",
                request_payload={"body": input_data.model_dump(mode="json")},
                error=str(e)
            ))
            await db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"生成用户画像时发生内部错误: {e}")

@router.get("/models/available")
async def list_available_models(current_user: user_models.User = Depends(get_current_user_flexible)):
    """返回四个Key（两硅基流动、两OpenAI）可用的模型列表（若某Key为空则跳过）。"""
    try:
        data = await run_in_threadpool(sf_client.list_all_models)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"拉取模型列表失败: {e}")

