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

### 用户画像查询（main.py）
- POST `/api/personal-statement-profiles` body: { user_id, name }
  - 功能：按 `user_id` + `name` 精确匹配 `personal_statement_profiles`，按创建时间降序返回数组，每项包含 { id, name, profile_md }
  - 400：`name 不能为空` 或 `user_id 非法`
  - 401：`无效或已禁用的用户`

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
- POST `/personal-statement-profile/` body: { user_id, text(markdown), model } → 返回 { name, profile_md }
  - 行为：从文本中严格抽取姓名（Prompt 禁止从邮箱/链接/ID 等推断）；若无法确定姓名则返回 400，不入库
- GET `/models/available` → 返回所有已配置 Key（两硅基流动、两OpenAI）的可用模型列表

说明：`model` 取值见枚举 `ModelChoice`（如 `deepseek-ai/DeepSeek-V3` 等）。

### 日志记录（后端透明）
所有上述业务接口会写入日志表 `api_logs`，记录 `user_id`、请求体、系统 Prompt、模型、token 用量与响应等。

### 数据库初始化顺序
1. `users.sql`
2. `documents.sql`
3. `documents_versions.sql`
4. `migration.sql`
5. `api_logs.sql`
6. `personal_statement_profile.sql`（包含 `user_id` 外键、`name` 字段、按 `user_id` 与 `created_at` 建索引）

### 使用示例

生成并写入用户画像：
```
POST /personal-statement-profile/
Content-Type: application/json
{
  "user_id": "00000000-0000-0000-0000-000000000000",
  "text": "...含个人经历/目标的 Markdown...",
  "model": "deepseek-ai/DeepSeek-V3"
}
```
成功时响应：
```
{ "name": "张三", "profile_md": "..." }
```

查询用户画像：
```
POST /api/personal-statement-profiles
Content-Type: application/json
{
  "user_id": "00000000-0000-0000-0000-000000000000",
  "name": "张三"
}
```

### 模型与负载均衡
- 支持多提供商多密钥的负载均衡（轮询 + RPM/TPM 限速 + 熔断）：
  - 硅基流动：`SILICONFLOW_API_KEY`, `SILICONFLOW_API_KEY_2`
  - OpenAI(ChatGPT)：`OPENAI_API_KEY`, `OPENAI_API_KEY_2`
  - 可选限速：`*_KEY{N}_RPM`, `*_KEY{N}_TPM`
  - 提供商 Base URL：`SILICONFLOW_BASE_URL`, `OPENAI_BASE_URL`
  - 允许留空，留空则自动跳过该 Key

#### 列出可用模型
- GET `/models/available`
- 响应示例（精简）：
```
{
  "providers": [
    {"provider": "siliconflow", "base_url": "https://api.siliconflow.cn/v1", "key_index": 0, "models": ["deepseek-ai/DeepSeek-V3", "..."]},
    {"provider": "openai", "base_url": "https://api.openai.com/v1", "key_index": 2, "models": ["gpt-4o", "..."]}
  ],
  "unique_models": ["deepseek-ai/DeepSeek-V3", "gpt-4o", "..."]
}
```