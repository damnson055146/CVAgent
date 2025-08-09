### 平台后端 API 文档（当前版本）

### 公共说明
- Base URL: http://<HOST>:8699
- Content-Type: application/json（仅上传 PDF 的接口为 multipart/form-data）
- 鉴权：除用户登录模块外，业务接口不再使用头部鉴权。所有需要鉴权的业务接口在请求体中携带 `user_id` 用于校验与日志关联。

### 健康检查
- GET `/` → { "message": "CV Agent API is running!" }
- GET `/health` → { "status": "healthy", "service": "CV Agent API" }

### 用户管理（auth_routes）
- POST `/auth/register` body: { email, username?, password }
- POST `/auth/login` body: { username, password } → 返回 { access_token, token_type, user_id, username, email }
- POST `/auth/logout`
- GET `/auth/me`（需要携带登录产生的 token）
- POST `/auth/refresh`（需要 token）

### 文档与版本（main.py）
- POST `/api/documents/{doc_type}/create` body: { user_id }
- DELETE `/api/documents/{doc_id}/delete` body: { user_id }
- POST `/api/documents/{doc_type}/history` body: { user_id }
- POST `/api/versions/{doc_id}/save` body: { user_id, content_md, user_profile? }
- POST `/api/versions/{doc_id}/history` body: { user_id }
- POST `/api/versions/{version_id}/content` body: { user_id } → 返回 { id, content, user_profile }
- DELETE `/api/versions/{version_id}/delete` body: { user_id }
- POST `/api/versions/{doc_id}/user_profile_save` body: { user_id, user_profile }

说明：`doc_type ∈ { resume, personal_statement, recommendation }`

### 文本与简历处理（routes.py，基于 SiliconFlow）
- POST `/parse-resume/` form-data: file(PDF), model, user_id
- POST `/parse-resume-text/` body: { user_id, text, model }
- POST `/optimize-text/` body: { user_id, text, model }
- POST `/expand-text/` body: { user_id, text, model }
- POST `/contract-text/` body: { user_id, text, model }
- POST `/evaluate-resume/` body: { user_id, model, data: object }
- POST `/modified-text-prompt/` body: { user_id, text, prompt, model }
- POST `/generate-statement/` body: { user_id, text, model }
- POST `/generate-recommendation/` body: { user_id, text, model }
- POST `/user-profile/` body: { user_id, text, model } → 返回 { document_name }

说明：`model` 取值见枚举 `ModelChoice`（如 `deepseek-ai/DeepSeek-V3` 等）。

### 日志记录（后端透明）
所有上述业务接口会写入日志表 `api_logs`，记录 `user_id`、请求体、系统 Prompt、模型、token 用量与响应等。

### 数据库初始化顺序
1. `users.sql`
2. `documents.sql`
3. `documents_versions.sql`
4. `migration.sql`
5. `api_logs.sql`