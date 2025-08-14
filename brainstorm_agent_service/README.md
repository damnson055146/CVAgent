# Brainstorm Agent Service

AI驱动的头脑风暴服务，具有双重缓存和用户画像对齐功能。

## 功能特性

- 🤖 **AI驱动**: 支持OpenAI和SiliconFlow模型
- 🚀 **双重缓存**: 软缓存（内存）+ 硬缓存（Redis）
- 👤 **用户画像对齐**: 确保生成的问题与用户背景高度匹配
- ⚡ **高性能**: 异步处理，快速响应
- 🔧 **可配置**: 支持多种配置选项

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `env.example` 为 `.env` 并配置相关参数：

```bash
cp env.example .env
```

### 3. 启动服务

```bash
python main.py
```

服务将在 `http://localhost:8700` 启动。

## API接口

### 生成头脑风暴问题

```http
POST /api/brainstorm/questions
Content-Type: application/json

{
  "user_id": "user123",
  "cv_content": "用户简历内容...",
  "manual_info": {
    "education": "计算机科学",
    "experience": "3年工作经验"
  },
  "user_profile": "用户画像信息...",
  "model": "deepseek-ai/DeepSeek-V3"
}
```

### 获取缓存统计

```http
GET /api/brainstorm/cache/stats
```

### 清空缓存

```http
DELETE /api/brainstorm/cache/clear
```

### 健康检查

```http
GET /api/brainstorm/health
```

## 缓存机制

### 软缓存（内存）
- 使用LRU策略
- 快速访问
- 服务重启后清空

### 硬缓存（Redis）
- 持久化存储
- 可配置TTL
- 跨服务共享

## 用户画像对齐

服务会自动分析生成的问题是否与用户画像匹配，并提供对齐建议。

## Docker部署

```bash
# 构建镜像
docker build -t brainstorm-agent .

# 运行容器
docker run -p 8700:8700 brainstorm-agent
```

## 配置说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `REDIS_URL` | Redis连接地址 | `redis://localhost:6379/0` |
| `SOFT_CACHE_SIZE` | 软缓存大小 | `1000` |
| `HARD_CACHE_TTL` | 硬缓存TTL（秒） | `86400` |
| `USER_PROFILE_ALIGNMENT_ENABLED` | 启用用户画像对齐 | `true` |

## 开发

### 项目结构

```
brainstorm_agent_service/
├── app/
│   ├── core/           # 核心配置和缓存
│   ├── models/         # 数据模型
│   ├── routers/        # API路由
│   ├── services/       # 业务逻辑
│   └── utils/          # 工具函数
├── main.py             # 应用入口
├── requirements.txt    # 依赖列表
└── Dockerfile         # Docker配置
```

### 添加新功能

1. 在 `app/services/` 中添加业务逻辑
2. 在 `app/models/schemas.py` 中定义数据模型
3. 在 `app/routers/` 中添加API路由
4. 更新文档和测试

## 许可证

MIT License
