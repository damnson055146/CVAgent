### 平台后端 API 文档（当前版本）

### 公共说明
- Base URL: http://<HOST>:8699
- Content-Type: application/json（仅上传 PDF 的接口为 multipart/form-data）
- 鉴权：所有业务接口（登录外）统一使用 access_token 进行鉴权。
  - Authorization 头：`Authorization: Bearer <access_token>`，或
  - Cookie：`access_token=<access_token>`（登录接口已设置）
  - 历史上的请求体字段 `user_id` 已不再必需，仅为兼容保留为可选并会被忽略（后端总是以 access_token 解析出的用户为准）。

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
- POST `/api/documents/{doc_type}/create` body: {}
- DELETE `/api/documents/{doc_id}/delete` body: {}
- POST `/api/documents/{doc_type}/history` body: {}
- POST `/api/versions/{doc_id}/save` body: { content_md, user_profile? }
- DELETE `/api/versions/{version_id}/delete` body: {}
- POST `/api/versions/{doc_id}/history` body: {}
- POST `/api/versions/{version_id}/content` body: {} → 返回 { id, content, user_profile }
- POST `/api/versions/{doc_id}/version-name-save` body: { user_profile }

#### 详细接口说明（输入/输出与数据库字段映射）

1) 创建文档
- POST `/api/documents/{doc_type}/create`
- 入参：`{}`（无需 user_id）
- 出参：
```
{
  "id": "<documents.id>",
  "user_id": "<documents.user_id>",
  "type": "<documents.type>",
  "current_version_id": "<documents.current_version_id>",
  "content_md": "",  // 非数据库字段，固定空
  "created_at": "<documents.created_at>",
  "updated_at": "<documents.updated_at>"
}
```

2) 获取文档历史列表（按类型）
- POST `/api/documents/{doc_type}/history`
- 入参：`{}`
- 出参（数组，每项映射到 documents 表一行）：
```
[
  {
    "id": "<documents.id>",
    "user_id": "<documents.user_id>",
    "type": "<documents.type>",
    "title": "<documents.title>",
    "current_version_id": "<documents.current_version_id>",
    "created_at": "<documents.created_at>",
    "updated_at": "<documents.updated_at>"
  }
]
```

3) 保存版本内容（创建新版本）
- POST `/api/versions/{doc_id}/save`
- 入参：
```
{ "content_md": "...", "user_profile": "..." }
```
- 出参：
```
{
  "id": "<documents.id>",
  "user_id": "<documents.user_id>",
  "type": "<documents.type>",
  "current_version_id": "<documents.current_version_id>",
  "content_md": "<document_versions.content>",
  "created_at": "<documents.created_at>",
  "updated_at": "<documents.updated_at>"
}
```

4) 获取版本历史
- POST `/api/versions/{doc_id}/history`
- 入参：`{}`
- 出参（数组，每项映射到 document_versions 表一行）：
```
[
  {
    "id": "<document_versions.id>",
    "version_number": <document_versions.version_number>,
    "created_at": "<document_versions.created_at>",
    "content_snippet": "基于 <document_versions.content> 截取的前100字"
  }
]
```

5) 获取单个版本内容
- POST `/api/versions/{version_id}/content`
- 入参：`{}`
- 出参：
```
{
  "id": "<document_versions.id>",
  "content": "<document_versions.content>",
  "user_profile": "<document_versions.user_profile>"
}
```

6) 删除版本（软删）
- DELETE `/api/versions/{version_id}/delete`
- 入参：无
- 出参：HTTP 204（无内容）

7) 为版本生成名称（不入库）
- POST `/version-name/`
- 入参：
```
{ "text": "...", "model": "deepseek-ai/DeepSeek-V3" }
```
- 出参：
```
{ "document_name": "模型生成的名称" }
```

8) 为版本保存名称
- POST `/api/versions/{doc_id}/version-name-save`
- 入参：
```
{ "user_profile": "最终版-用于投递" }
```
- 出参：
```
{ "version_id": "<document_versions.id>", "user_profile": "<document_versions.user_profile>" }
```

### 用户画像查询（main.py）
- POST `/api/personal-statement-profiles` body: { name }
  - 功能：按当前鉴权用户 + `name` 精确匹配 `personal_statement_profiles`，按创建时间降序返回数组，每项包含 { id, name, profile_md }
  - 400：`name 不能为空`

说明：`doc_type ∈ { resume, personal_statement, recommendation }`

### 文本与简历处理（routes.py，基于 SiliconFlow）
- POST `/parse-resume/` form-data: file(PDF), model
- POST `/parse-resume-text/` body: { text, model }
- POST `/optimize-text/` body: { text, model }
- POST `/expand-text/` body: { text, model }
- POST `/contract-text/` body: { text, model }
- POST `/evaluate-resume/` body: { model, data: object }
- POST `/modified-text-prompt/` body: { text, prompt, model }
- POST `/generate-statement/` body: { text, model }
- POST `/generate-recommendation/` body: { text, model }
- POST `/version-name/` body: { text, model } → 返回 { document_name }
- POST `/personal-statement-profile/` body: { user_id, text(markdown), model } → 返回 { name, profile_md }
  - 行为：从文本中严格抽取姓名（Prompt 禁止从邮箱/链接/ID 等推断）；若无法确定姓名则返回 400，不入库
- GET `/models/available` → 返回所有已配置 Key（两硅基流动、两OpenAI）的可用模型列表

说明：`model` 取值参考模型列表接口返回的可用模型（如 `deepseek-ai/DeepSeek-V3` 等）。

### 日志记录（后端透明）
所有上述业务接口会写入日志表 `api_logs`，记录 `user_id`、请求体、系统 Prompt、模型、token 用量与响应等。

### 数据库初始化顺序
1. `users.sql`
2. `documents.sql`
3. `documents_versions.sql`
4. `migration.sql`
5. `api_logs.sql`
6. `personal_statement_profile.sql`（包含 `user_id` 外键、`name` 字段、按 `user_id` 与 `created_at` 建索引）

### 使用示例（节选）

生成并写入用户画像：
```
POST /personal-statement-profile/
Content-Type: application/json
{
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
  "name": "张三"
}
```

生成结构化个人陈述（英文键名）：
```
POST /generate-statement/
Content-Type: application/json
{
  "text": "候选人的中文背景信息...",
  "model": "deepseek-ai/DeepSeek-V3"
}
```
响应：
```
{
  "personal_statement": {
    "introduction_and_goals": "…",
    "research_experience": "…",
    "activities_and_leadership": "…",
    "career_plan": "…",
    "reasons_for_school": "…",
    "conclusion": "…"
  }
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