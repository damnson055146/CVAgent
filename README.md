# CV Agent - AI驱动的留学申请助手

## 🚀 快速开始

### 环境要求
- Docker Desktop
- 至少4GB内存
- 至少10GB磁盘空间

### 一键启动
```bash
# 克隆项目
git clone <repository-url>
cd cv-agent

# 一键启动所有服务
./start.sh
```

### 手动启动
```bash
# 构建并启动所有服务
docker compose up --build -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

## 📱 访问地址

- **前端应用**: http://localhost
- **后端API**: http://localhost:8700
- **数据库**: localhost:5400

## 🧪 测试账号

- **用户名**: testuser
- **密码**: testpassword

## 🔧 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f [service_name]

# 进入容器
docker compose exec [service_name] bash

# 重新构建
docker compose up --build -d

# 清理数据
docker compose down -v
```

## 📋 功能特性

### 前端功能
- 📝 简历编辑和优化
- 📄 个人陈述生成
- 💌 推荐信生成
- 🎨 多种模板样式
- 📱 响应式设计

### 后端功能
- 🔐 用户认证系统
- 📊 文档版本管理
- 🤖 AI文本优化
- 📈 简历评估分析
- 🔄 实时同步

### 数据库
- 🗄️ PostgreSQL 15
- 📋 用户管理
- 📄 文档存储
- 🔄 版本控制

## 🛠️ 技术栈

### 前端
- React 18
- Vite
- Tailwind CSS
- React Router

### 后端
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT认证

### 部署
- Docker
- Docker Compose
- Nginx

## 🔍 故障排除

### 端口冲突
如果遇到端口冲突，可以修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8080:80"  # 前端
  - "8701:8000"  # 后端
  - "5400:5432"  # 数据库
```

### 网络问题
如果在中国大陆使用，已配置国内镜像源：
- Python: 清华大学镜像源
- Node.js: 淘宝镜像源
- Docker: 阿里云镜像源

### 性能优化
- 使用多阶段构建减少镜像大小
- 配置nginx缓存和压缩
- 数据库连接池优化

## 📞 获取帮助

如果遇到问题，请：
1. 检查Docker是否正常运行
2. 查看容器日志：`docker compose logs`
3. 确保端口未被占用
4. 检查网络连接

## �� 许可证

MIT License 