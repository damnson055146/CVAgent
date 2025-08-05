# Docker 部署指南

本项目已配置为可以独立作为 Docker 容器运行。

## 🚀 快速开始

### 方法一：使用 Docker Compose（推荐）

```bash
# 构建并启动容器
docker compose up -d --build

# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f frontend

# 停止容器
docker compose down
```

### 方法二：使用脚本

**Linux/Mac:**
```bash
chmod +x run-docker.sh
./run-docker.sh
```

**Windows:**
```cmd
run-docker.bat
```

### 方法三：手动构建和运行

```bash
# 构建镜像
docker build -t cv-frontend .

# 运行容器
docker run -d --name cv-frontend -p 5173:80 --restart unless-stopped cv-frontend
```

## 🌐 访问应用

容器启动后，可以通过以下地址访问：
- **应用地址**: http://localhost:5173
- **健康检查**: http://localhost:5173/health

## 📋 常用命令

```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs cv-frontend

# 停止容器
docker stop cv-frontend

# 重启容器
docker restart cv-frontend

# 进入容器
docker exec -it cv-frontend sh

# 删除容器
docker rm cv-frontend

# 删除镜像
docker rmi cv-frontend
```

## 🔧 配置说明

### 环境变量

可以通过环境变量配置应用：

```bash
docker run -d \
  --name cv-frontend \
  -p 5173:80 \
  -e VITE_API_BASE_URL=http://your-api-server:8699 \
  -e VITE_API_KEY=your-api-key \
  cv-frontend
```

### 端口映射

默认端口映射为 `5173:80`，可以修改为其他端口：

```bash
docker run -d --name cv-frontend -p 8080:80 cv-frontend
```

## 🏗️ 构建优化

Dockerfile 使用了多阶段构建来优化镜像大小：

1. **构建阶段**: 使用 Node.js 环境构建应用
2. **生产阶段**: 使用 Nginx 提供静态文件服务

### 安全特性

- 包含健康检查
- 设置了安全头
- 优化了文件权限

### 性能优化

- 启用了 Gzip 压缩
- 配置了静态资源缓存
- 使用 Alpine Linux 减小镜像大小
- 多阶段构建减少最终镜像大小

## 🔍 故障排除

### 容器无法启动

1. 检查端口是否被占用：
   ```bash
   netstat -tulpn | grep :5173
   ```

2. 查看容器日志：
   ```bash
   docker logs cv-frontend
   ```

### 应用无法访问

1. 检查容器状态：
   ```bash
   docker ps
   ```

2. 检查健康状态：
   ```bash
   curl http://localhost:5173/health
   ```

### 构建失败

1. 清理 Docker 缓存：
   ```bash
   docker system prune -a
   ```

2. 重新构建：
   ```bash
   docker build --no-cache -t cv-frontend .
   ```

## 📦 生产部署

对于生产环境，建议：

1. 使用 Docker Registry 存储镜像
2. 配置反向代理（如 Nginx）
3. 设置 SSL 证书
4. 配置监控和日志收集
5. 使用 Docker Swarm 或 Kubernetes 进行编排

## 🆘 支持

如果遇到问题，请检查：
1. Docker 版本是否最新
2. 系统资源是否充足
3. 网络连接是否正常
4. 防火墙设置是否正确 