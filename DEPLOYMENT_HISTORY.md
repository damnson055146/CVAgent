# CVAgent 部署历程文档

## 📋 项目概述

CVAgent 是一个AI驱动的留学申请助手，整合了简历编辑、个人陈述生成、推荐信生成等功能。项目采用前后端分离架构，使用Docker容器化部署。

## 🏗️ 技术架构

### 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (PostgreSQL)  │
│   Port: 80      │    │   Port: 8699    │    │   Port: 5400    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Nginx         │
                    │   (Reverse Proxy)│
                    │   Port: 80      │
                    └─────────────────┘
```

### 技术栈
- **前端**: React 18 + Vite + Tailwind CSS
- **后端**: FastAPI + SQLAlchemy + PostgreSQL
- **部署**: Docker + Docker Compose + Nginx
- **AI服务**: SiliconFlow API + Dify API

## 🚀 部署历程

### 第一阶段：项目初始化 (v0.1.0)

**时间**: 项目启动初期

**目标**: 建立基础项目结构

**完成内容**:
- [x] 创建基础项目目录结构
- [x] 设置前后端分离架构
- [x] 配置基础开发环境
- [x] 实现简单的Docker配置

**技术决策**:
- 选择FastAPI作为后端框架（高性能、自动API文档）
- 选择React作为前端框架（组件化、生态丰富）
- 使用PostgreSQL作为主数据库（ACID特性、JSON支持）

### 第二阶段：核心功能开发 (v0.2.0 - v0.5.0)

**时间**: 功能开发期

**目标**: 实现核心业务功能

**完成内容**:
- [x] 用户认证系统（JWT）
- [x] 简历编辑功能
- [x] 个人陈述生成
- [x] 推荐信生成
- [x] 文档版本管理
- [x] AI文本优化功能

**部署改进**:
- [x] 优化Docker镜像构建
- [x] 添加健康检查机制
- [x] 实现服务依赖管理
- [x] 配置环境变量管理

### 第三阶段：部署优化 (v0.6.0 - v0.8.0)

**时间**: 部署优化期

**目标**: 提升部署稳定性和可维护性

**完成内容**:
- [x] 创建自动化部署脚本 (`deploy.sh`)
- [x] 实现一键启动脚本 (`start.sh`)
- [x] 添加Nginx反向代理配置
- [x] 优化数据库初始化流程
- [x] 实现服务健康检查
- [x] 添加日志管理

**关键改进**:
```bash
# 部署脚本自动化
./deploy.sh  # 完整的部署流程
./start.sh   # 快速启动服务
```

### 第四阶段：生产环境准备 (v1.0.0)

**时间**: 生产部署期

**目标**: 准备生产环境部署

**完成内容**:
- [x] 完善环境变量配置
- [x] 添加安全配置
- [x] 实现缓存机制（Redis）
- [x] 优化性能配置
- [x] 添加监控和日志
- [x] 完善文档

## 📁 部署文件结构

```
CVAgent/
├── docker-compose.yml          # 服务编排配置
├── start.sh                    # 一键启动脚本
├── backend/
│   ├── Dockerfile              # 后端镜像配置
│   ├── deploy.sh               # 后端部署脚本
│   ├── DEPLOYMENT.md           # 后端部署文档
│   ├── env.example             # 环境变量模板
│   └── config/
│       └── sql_postgre/        # 数据库初始化脚本
├── frontend/
│   ├── Dockerfile              # 前端镜像配置
│   └── env.example             # 前端环境变量
└── Nginx/
    ├── Dockerfile              # Nginx镜像配置
    └── nginx.conf              # Nginx配置
```

## 🔧 部署配置详解

### Docker Compose 配置

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: aiagent
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 13689282250
    ports:
      - "5400:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/config/sql_postgre:/docker-entrypoint-initdb.d
    networks:
      - cv-agent-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+psycopg2://postgres:13689282250@postgres:5432/aiagent
      SECRET_KEY: cv-agent-secret-key-change-in-production
      # ... 其他环境变量
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - cv-agent-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8699/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    networks:
      - cv-agent-network
    restart: unless-stopped

  nginx:
    build:
      context: ./Nginx
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
      - frontend
    networks:
      - cv-agent-network
    restart: unless-stopped
```

### 环境变量配置

**必需配置**:
```bash
# 数据库配置
POSTGRES_DB=aiagent
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# AI服务配置
SILICONFLOW_API_KEY=your_siliconflow_key
DIFY_API_KEY_PARSE=your_dify_parse_key
DIFY_API_KEY_REWRITE=your_dify_rewrite_key
# ... 其他Dify API密钥

# 应用配置
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

## 🚀 部署流程

### 1. 环境准备
```bash
# 检查Docker环境
docker --version
docker-compose --version

# 克隆项目
git clone <repository-url>
cd CVAgent
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env

# 编辑配置文件
nano backend/.env
nano frontend/.env
```

### 3. 一键部署
```bash
# 使用部署脚本
./start.sh

# 或手动部署
docker-compose up --build -d
```

### 4. 验证部署
```bash
# 检查服务状态
docker-compose ps

# 健康检查
curl http://localhost/health
curl http://localhost:8699/health

# 查看日志
docker-compose logs -f
```

## 🔍 监控和维护

### 服务监控
```bash
# 查看服务状态
docker-compose ps

# 查看资源使用
docker stats

# 查看日志
docker-compose logs -f [service_name]
```

### 健康检查
- **后端API**: `http://localhost:8699/health`
- **数据库**: 自动健康检查
- **Nginx**: 自动健康检查

### 日志管理
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## 🛠️ 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8699
   netstat -tulpn | grep :5400
   
   # 修改端口映射
   # 编辑 docker-compose.yml
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库服务
   docker-compose exec postgres pg_isready -U postgres
   
   # 查看数据库日志
   docker-compose logs postgres
   ```

3. **服务启动失败**
   ```bash
   # 重新构建镜像
   docker-compose build --no-cache
   
   # 清理并重启
   docker-compose down -v
   docker-compose up -d
   ```

### 调试模式
```bash
# 以调试模式启动
docker-compose up

# 进入容器调试
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 📊 性能优化

### 已实现的优化
- [x] 数据库连接池配置
- [x] Redis缓存机制
- [x] 静态资源压缩
- [x] 镜像层优化
- [x] 健康检查机制

### 建议的优化
- [ ] 负载均衡配置
- [ ] CDN集成
- [ ] 数据库读写分离
- [ ] 容器资源限制
- [ ] 日志聚合系统

## 🔒 安全配置

### 已实现的安全措施
- [x] JWT认证机制
- [x] 环境变量管理
- [x] 数据库密码加密
- [x] API访问控制
- [x] HTTPS配置（生产环境）

### 安全建议
- [ ] 定期更新依赖包
- [ ] 配置防火墙规则
- [ ] 实现API限流
- [ ] 添加WAF保护
- [ ] 定期安全扫描

## 📈 版本历史

### v1.0.0 (当前版本)
- ✅ 完整的Docker部署支持
- ✅ 自动化部署脚本
- ✅ 健康检查机制
- ✅ 生产环境配置
- ✅ 完整的文档

### v0.8.0
- ✅ Nginx反向代理
- ✅ 服务依赖管理
- ✅ 环境变量优化

### v0.5.0
- ✅ 核心功能实现
- ✅ 基础Docker配置
- ✅ 数据库集成

### v0.2.0
- ✅ 项目架构设计
- ✅ 基础功能开发
- ✅ 开发环境配置

## 🎯 未来规划

### 短期目标 (1-2个月)
- [ ] 添加Kubernetes部署支持
- [ ] 实现CI/CD流水线
- [ ] 添加监控告警系统
- [ ] 优化数据库性能

### 中期目标 (3-6个月)
- [ ] 微服务架构重构
- [ ] 多租户支持
- [ ] 国际化支持
- [ ] 移动端适配

### 长期目标 (6-12个月)
- [ ] 云原生架构
- [ ] 大数据分析
- [ ] AI模型优化
- [ ] 企业级功能

## 📞 技术支持

### 获取帮助
1. 查看项目文档
2. 检查部署日志
3. 提交Issue
4. 联系开发团队

### 联系方式
- 项目仓库: [GitHub Repository]
- 问题反馈: [Issues Page]
- 技术文档: [Documentation]

---

**最后更新**: 2024年12月
**文档版本**: v1.0.0
**维护者**: CVAgent开发团队
