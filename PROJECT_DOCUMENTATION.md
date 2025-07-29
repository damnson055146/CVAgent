# CV Agent 项目整体运行文档

## 项目概述

CV Agent 是一个智能简历处理系统，提供简历解析、文本优化、个人陈述生成、推荐信生成等功能。项目采用前后端分离架构，前端使用 React + Vite，后端使用 FastAPI + Python。

## 技术架构

### 前端架构
```
frontend/
├── src/
│   ├── components/          # React组件
│   │   ├── CVcomponents/   # 简历相关组件
│   │   └── Comcomponents/  # 通用组件
│   ├── services/           # API服务层
│   ├── pages/             # 页面组件
│   └── utils/             # 工具函数
├── public/                # 静态资源
└── package.json          # 依赖配置
```

### 后端架构
```
backend/
├── app/
│   ├── api/              # API路由层
│   ├── core/             # 核心配置
│   ├── models/           # 数据模型
│   ├── services/         # 业务服务层
│   └── crud.py          # 数据库操作
├── Dify_workflow/        # AI工作流配置
├── main.py              # 应用入口
└── requirements.txt     # Python依赖
```

### 系统架构图
```
┌─────────────┐    HTTP/HTTPS    ┌─────────────┐    API调用    ┌─────────────┐
│   前端      │ ────────────────→ │   后端      │ ────────────→ │   Dify AI   │
│  React App  │                  │  FastAPI    │               │   服务      │
└─────────────┘                  └─────────────┘               └─────────────┘
       │                                │                              │
       │                                │                              │
       ▼                                ▼                              ▼
┌─────────────┐                  ┌─────────────┐              ┌─────────────┐
│  本地存储   │                  │  数据库     │              │  LLM模型    │
│ LocalStorage│                  │ PostgreSQL  │              │ (DeepSeek)  │
└─────────────┘                  └─────────────┘              └─────────────┘
```

## 环境要求

### 系统要求
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **内存**: 最少 4GB RAM，推荐 8GB+
- **存储**: 最少 2GB 可用空间
- **网络**: 稳定的互联网连接（用于AI服务调用）

### 软件要求
- **Node.js**: 18.0.0+
- **Python**: 3.8+
- **Git**: 2.20+
- **Docker**: 20.10+ (可选，用于容器化部署)

### 可选环境
- **Docker & Docker Compose**: 用于容器化部署
- **PostgreSQL**: 用于生产环境数据库

## 快速启动

### 1. 克隆项目
```bash
git clone <repository-url>
cd cv-agent
```

### 2. 后端设置

#### 创建虚拟环境
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

#### 安装依赖
```bash
pip install -r requirements.txt
```

#### 配置环境变量
创建 `backend/.env` 文件：
```env
# API密钥
API_KEY=9589ca16aa2844de6975809fbac3891ef2a105eadcde6f56e044c60b6b774ec4

# Dify服务配置（远程服务）
DIFY_API_URL=http://47.93.166.93/v1/chat-messages

# 本地Dify服务配置（如果使用本地部署）
# DIFY_API_URL=http://localhost:5001/v1/chat-messages

# Dify各功能API密钥
DIFY_API_KEY_PARSE=app-vUxIgRioYdHMLHNXthPohBBY
DIFY_API_KEY_REWRITE=app-NSMi2PZtYBCE9ITWSMPH7kml
DIFY_API_KEY_EXPAND=app-WHKgL6UEpETSTjx1BkINhLlW
DIFY_API_KEY_CONTRACT=app-TKSk1t6qRkCTFfPtwuyRbOuT
DIFY_API_KEY_PROCESS_TEXT=app-yJ7LozBBr8NGN3e1Qi9YleAQ
DIFY_API_KEY_PERSONAL_STATEMENT=app-0MxV1MnP63vkOhL8RhM2uL33
DIFY_API_KEY_RECOMMENDATION=app-rdL3VKcnhQaKYkSPXXfRnXih
DIFY_API_KEY_PROMPT_BASED=app-wXht7rntyPhIPrcvnshpJ3ba

# 数据库配置（可选）
# DATABASE_URL=postgresql://user:password@localhost/dbname

# 日志级别
LOG_LEVEL=INFO
```

#### 启动后端服务
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8699
```

### 3. 前端设置

#### 安装依赖
```bash
cd frontend
npm install
```

#### 启动前端服务
```bash
npm run dev
```

### 4. 访问应用
- **前端应用**: http://localhost:5173
- **后端API**: http://localhost:8699
- **API文档**: http://localhost:8699/docs

## API接口文档

### 认证机制
所有API请求需要在请求头中包含API密钥：
```
X-API-Key: 9589ca16aa2844de6975809fbac3891ef2a105eadcde6f56e044c60b6b774ec4
```

### 核心接口

#### 1. 简历解析

**PDF解析**
```http
POST /parse-resume/
Content-Type: multipart/form-data
X-API-Key: <api-key>

Body:
- file: PDF文件
```

**响应体**:
```json
{
  "user_uid": "user-001",
  "user_name": "张三",
  "user_contact_info": {
    "phone": "138-0000-0000",
    "email": "zhangsan@email.com"
  },
  "user_education": [
    {
      "user_university": "北京大学",
      "user_major": "计算机科学",
      "degree": "学士",
      "dates": "2018-2022",
      "details": "核心课程：数据结构、算法设计",
      "user_gpa": "3.8/4.0"
    }
  ],
  "internship_experience": [
    {
      "company": "腾讯",
      "role": "软件工程师",
      "location": "深圳",
      "dates": "2021.06-2021.09",
      "description_points": [
        "负责后端API开发",
        "优化数据库查询性能"
      ]
    }
  ],
  "user_research_experience": [],
  "user_extracurricular_activities": [],
  "user_target": "申请软件工程师职位"
}
```

**文本解析**
```http
POST /parse-resume-text/
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "text": "简历文本内容..."
}
```

#### 2. 文本优化

**文本优化**
```http
POST /optimize-text/
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "text": "需要优化的文本"
}
```

**响应体**:
```json
{
  "rewritten_text": "优化后的文本内容"
}
```

**文本扩写**
```http
POST /expand-text/
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "text": "需要扩写的文本"
}
```

**响应体**:
```json
{
  "expanded_text": "扩写后的文本内容"
}
```

**文本缩写**
```http
POST /contract-text/
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "text": "需要缩写的文本"
}
```

**响应体**:
```json
{
  "contracted_text": "缩写后的文本内容"
}
```

#### 3. 文档生成

**个人陈述生成**
```http
POST /generate_statement/
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "text": "个人信息和要求"
}
```

**响应体**:
```json
{
  "personal_statement": "生成的个人陈述内容",
  "structure": {
    "introduction": "引言部分",
    "body": "主体部分",
    "conclusion": "结论部分"
  }
}
```

**推荐信生成**
```http
POST /generate_recommendation/
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "text": "被推荐人信息和要求"
}
```

**响应体**:
```json
{
  "recommendation_letter": "生成的推荐信内容",
  "format": "正式推荐信格式"
}
```

#### 4. 自定义提示修改
```http
POST /modified-text-prompt/
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "text": "原始文本",
  "prompt": "自定义修改指令"
}
```

**响应体**:
```json
{
  "modified_text": "根据指令修改后的文本"
}
```

#### 5. 简历评估
```http
POST /evaluate-resume/
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "user_uid": "user-001",
  "user_name": "张三",
  // ... 完整的简历JSON结构
}
```

**响应体**:
```json
{
  "processed_text": "简历评估结果和建议"
}
```

#### 6. 文档管理

**保存简历**
```http
POST /api/documents_save/resume
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "user_id": "user-uuid",
  "content_md": "Markdown格式的简历内容"
}
```

**响应体**:
```json
{
  "id": "document-uuid",
  "user_id": "user-uuid",
  "type": "resume",
  "current_version_id": "version-uuid",
  "content_md": "保存的内容",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**获取简历历史**
```http
POST /api/documents/resume
Content-Type: application/json
X-API-Key: <api-key>

Body:
{
  "user_id": "user-uuid"
}
```

**响应体**:
```json
{
  "id": "document-uuid",
  "user_id": "user-uuid",
  "type": "resume",
  "current_version_id": "version-uuid",
  "content_md": "简历内容",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## 前端组件架构

### 核心组件

#### 1. PreviewEditor
- **功能**: 简历内容编辑和预览
- **特性**: 
  - 实时Markdown渲染
  - 文本选择工具栏
  - AI文本优化功能
  - 预览框显示

#### 2. SelectionToolbar
- **功能**: 文本选择后的操作工具栏
- **特性**:
  - 文本优化、扩写、缩写
  - 自定义提示词修改
  - AI预览结果展示

#### 3. PreviewBox
- **功能**: 选中文本的预览框
- **特性**:
  - 显示原始文本
  - 显示AI处理结果
  - 处理状态指示
  - 操作按钮

#### 4. Editbar
- **功能**: 编辑工具栏
- **特性**:
  - 字体、字号、行距设置
  - 撤销/重做功能
  - 样式切换
  - 智能布局

### 数据流
```
用户操作 → 组件状态更新 → API调用 → 后端处理 → AI服务 → 结果返回 → UI更新
```

## 后端服务架构

### 核心服务

#### 1. DifyClient
- **功能**: AI服务调用封装
- **方法**:
  - `parse_text()`: 文本解析
  - `rewrite_text()`: 文本优化
  - `expand_text()`: 文本扩写
  - `contract_text()`: 文本缩写
  - `generate_statement()`: 生成个人陈述
  - `generate_recommendation()`: 生成推荐信

#### 2. 路由层 (routes.py)
- **功能**: API端点定义
- **主要端点**:
  - `/parse-resume/`: PDF解析
  - `/parse-resume-text/`: 文本解析
  - `/optimize-text/`: 文本优化
  - `/expand-text/`: 文本扩写
  - `/contract-text/`: 文本缩写
  - `/generate_statement/`: 个人陈述生成
  - `/generate_recommendation/`: 推荐信生成

#### 3. 数据模型 (schemas.py)
- **功能**: 请求/响应数据结构定义
- **主要模型**:
  - `TextInput`: 文本输入
  - `PromptTextInput`: 提示词输入
  - `NewResumeProfile`: 简历数据结构

### 错误处理
```python
# 统一错误响应格式
{
  "detail": "错误描述",
  "status_code": 400/500/502
}
```

## 运行注意事项

### 1. 环境配置
- 确保Python和Node.js版本符合要求
- 正确配置环境变量文件
- 检查网络连接（AI服务调用）

### 2. 端口配置
- **前端**: 5173 (默认)
- **后端**: 8699 (默认)
- **Dify控制台**: 3000 (本地部署时)
- **Dify API**: 5001 (本地部署时)

### 3. 依赖管理
- 后端依赖在 `requirements.txt` 中定义
- 前端依赖在 `package.json` 中定义
- 使用虚拟环境隔离Python依赖

### 4. 开发模式
- 后端支持热重载 (`--reload`)
- 前端支持热模块替换 (HMR)
- 实时错误提示和调试信息

### 5. 生产部署
- 使用 `npm run build` 构建前端
- 使用 `uvicorn main:app --host 0.0.0.0 --port 8699` 启动后端
- 配置反向代理 (Nginx)
- 设置环境变量

## 常见问题解决

### 1. 端口冲突
```bash
# 修改后端端口
uvicorn main:app --reload --host 0.0.0.0 --port 8080

# 修改前端端口
npm run dev -- --port 3000
```

### 2. API连接失败
- 检查后端服务是否启动
- 验证API密钥配置
- 确认网络连接正常

### 3. AI服务调用失败
- 检查Dify服务状态
- 验证API密钥有效性
- 查看服务日志

### 4. 文件上传失败
- 检查文件格式（仅支持PDF）
- 验证文件大小限制
- 确认上传权限

### 5. 数据库连接失败
- 检查数据库服务状态
- 验证连接字符串
- 确认数据库权限

## 性能优化

### 1. 前端优化
- 使用React.memo减少重渲染
- 实现虚拟滚动处理大文本
- 优化图片和资源加载
- 使用CDN加速静态资源

### 2. 后端优化
- 实现API响应缓存
- 使用异步处理提高并发
- 优化数据库查询
- 实现请求限流

### 3. AI服务优化
- 实现结果缓存
- 优化提示词模板
- 使用批量处理
- 监控API调用频率

## 安全考虑

### 1. API安全
- 使用HTTPS传输
- 实现API密钥轮换
- 添加请求频率限制
- 验证文件上传类型

### 2. 数据安全
- 加密敏感数据
- 实现数据备份
- 定期清理日志
- 遵守数据保护法规

### 3. 访问控制
- 实现用户认证
- 添加权限控制
- 记录操作日志
- 监控异常访问

## 监控和维护

### 1. 日志管理
- 前端错误日志收集
- 后端API调用日志
- AI服务调用日志
- 性能监控日志

### 2. 健康检查
```bash
# 检查后端服务
curl http://localhost:8699/

# 检查前端服务
curl http://localhost:5173/

# 检查Dify服务
curl http://localhost:5001/health
```

### 3. 备份策略
- 定期备份配置文件
- 备份数据库数据
- 备份用户上传文件
- 备份AI工作流配置

## 更新和升级

### 1. 前端更新
```bash
cd frontend
npm update
npm run build
```

### 2. 后端更新
```bash
cd backend
pip install -r requirements.txt --upgrade
```

### 3. 数据库迁移
```bash
# 执行数据库迁移脚本
psql -d database_name -f migration.sql
```

## 总结

CV Agent 项目是一个功能完整的智能简历处理系统，采用现代化的技术栈和架构设计。通过前后端分离、AI服务集成、模块化组件设计，提供了良好的用户体验和开发体验。

项目支持多种部署方式，可以根据实际需求选择本地开发、容器化部署或云服务部署。完善的文档和错误处理机制确保了系统的稳定性和可维护性。 