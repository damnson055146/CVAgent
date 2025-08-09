# Nginx反向代理配置

这个目录包含了系统的Nginx反向代理配置，用于统一管理前端和后端的请求路由。

## 架构说明

```
用户请求 → Nginx反向代理 → 前端/后端服务
```

- **Nginx反向代理**: 监听80端口，负责路由所有请求
- **前端服务**: 提供React应用的静态文件服务
- **后端服务**: 提供API接口服务
- **PostgreSQL**: 数据库服务

## 路由规则

### API请求
- `/api/*` → 代理到后端服务
- `/docs` → 直接代理到后端API文档
- `/openapi.json` → 直接代理到后端OpenAPI规范

### 前端请求
- `/*` → 代理到前端服务
- 支持React Router的SPA路由
- 静态资源有长期缓存

## 特性

### 性能优化
- Gzip压缩
- 静态资源缓存
- 连接池优化
- 负载均衡准备

### 安全特性
- 安全头设置
- XSS防护
- CSRF防护
- 内容类型嗅探防护

### 监控和日志
- 详细的访问日志
- 错误日志
- 健康检查端点

## 使用方法

### 启动整个系统
```bash
# 在项目根目录执行
docker-compose up -d
```

### 访问服务
- 前端应用: http://localhost
- API文档: http://localhost/docs
- 健康检查: http://localhost/health

### 查看日志
```bash
# 查看Nginx日志
docker-compose logs nginx

# 查看所有服务日志
docker-compose logs -f
```

### 停止服务
```bash
docker-compose down
```

## SSL配置（生产环境）

如需启用HTTPS，请：

1. 将SSL证书文件放在 `./ssl/` 目录
2. 取消注释 `docker-compose.yml` 中的SSL卷挂载
3. 取消注释 `nginx.conf` 中的HTTPS服务器配置
4. 更新证书路径和域名

## 故障排除

### 常见问题

1. **端口冲突**: 确保80和443端口未被占用
2. **服务启动失败**: 检查各服务的健康检查状态
3. **API请求失败**: 确认后端服务正常运行

### 调试命令
```bash
# 检查容器状态
docker-compose ps

# 进入Nginx容器
docker-compose exec nginx sh

# 测试Nginx配置
docker-compose exec nginx nginx -t

# 重新加载Nginx配置
docker-compose exec nginx nginx -s reload
```

## 配置说明

### nginx.conf
- 上游服务器配置
- 路由规则
- 安全头设置
- 缓存策略

### Dockerfile
- 基于Alpine Linux的轻量级镜像
- 多阶段构建优化
- 健康检查配置

## 扩展性

这个配置支持：
- 水平扩展（添加更多后端实例）
- 负载均衡
- 缓存层
- CDN集成
- 监控集成 