# CVAgent 后端部署指南

## 🚀 快速部署

### 前置要求

1. **Docker** (版本 20.10+)
2. **Docker Compose** (版本 2.0+)
3. **curl** (用于健康检查)

### 部署步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd CVAgent/backend
```

2. **配置环境变量**
```bash
cp env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

3. **运行部署脚本**
```bash
./deploy.sh
```

## 📋 环境变量配置

### 必需配置

```bash
# 数据库配置
POSTGRES_DB=cvagent
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Dify配置
DIFY_API_URL=your_dify_api_url
DIFY_API_KEY_PARSE=your_dify_parse_key
DIFY_API_KEY_REWRITE=your_dify_rewrite_key
DIFY_API_KEY_EXPAND=your_dify_expand_key
DIFY_API_KEY_CONTRACT=your_dify_contract_key
DIFY_API_KEY_PROCESS_TEXT=your_dify_process_text_key
DIFY_API_KEY_PERSONAL_STATEMENT=your_dify_personal_statement_key
DIFY_API_KEY_RECOMMENDATION=your_dify_recommendation_key
DIFY_API_KEY_PROMPT_BASED=your_dify_prompt_based_key
DIFY_API_KEY_NAMING=your_dify_naming_key

# AI服务配置（至少配置一个）
SILICONFLOW_API_KEY=your_siliconflow_key
OPENAI_API_KEY=your_openai_key
```

### 可选配置

```bash
# Redis配置
REDIS_URL=redis://localhost:6379/0
REDIS_TTL=3600

# 缓存配置
SOFT_CACHE_SIZE=1000
HARD_CACHE_TTL=86400

# 用户画像配置
USER_PROFILE_ALIGNMENT_ENABLED=true
```

## 🏗️ 服务架构

部署后包含以下服务：

- **PostgreSQL** (端口 5432) - 主数据库
- **Redis** (端口 6379) - 缓存服务
- **Backend API** (端口 8699) - 后端API服务

## 🔍 健康检查

### 手动检查

```bash
# 检查后端服务
curl http://localhost:8699/health

# 检查数据库
docker-compose exec postgres pg_isready -U postgres

# 检查Redis
docker-compose exec redis redis-cli ping
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

## 🛠️ 管理命令

### 启动服务
```bash
docker-compose up -d
```

### 停止服务
```bash
docker-compose down
```

### 重启服务
```bash
docker-compose restart
```

### 更新服务
```bash
docker-compose pull
docker-compose up -d --build
```

### 清理数据
```bash
# 停止服务并删除数据卷
docker-compose down -v
```

## 🔧 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口 8699, 5432, 6379 是否被占用
   - 修改 docker-compose.yml 中的端口映射

2. **数据库连接失败**
   - 检查 PostgreSQL 服务是否正常启动
   - 验证数据库连接字符串

3. **Redis连接失败**
   - 检查 Redis 服务是否正常启动
   - 验证 Redis URL 配置

4. **API密钥错误**
   - 检查 Dify API 密钥是否正确
   - 验证 AI 服务密钥配置

### 调试模式

```bash
# 以调试模式启动
docker-compose up

# 进入容器调试
docker-compose exec backend bash
```

## 📊 监控

### 服务状态
```bash
docker-compose ps
```

### 资源使用
```bash
docker stats
```

### API文档
访问 http://localhost:8699/docs 查看完整的API文档

## 🔒 安全建议

1. **修改默认密码**
   - 更改 PostgreSQL 默认密码
   - 使用强密码策略

2. **网络安全**
   - 配置防火墙规则
   - 限制端口访问

3. **数据备份**
   - 定期备份数据库
   - 备份配置文件

4. **日志管理**
   - 配置日志轮转
   - 监控错误日志

## 📝 更新日志

### v1.0.0
- 初始版本发布
- 集成头脑风暴功能
- 添加多轮对话支持
- 实现双重缓存系统
- 完整的Docker部署支持
