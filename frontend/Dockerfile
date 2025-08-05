# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 拷贝package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --no-audit --no-fund

# 拷贝源代码
COPY . .

# 设置构建时的环境变量
ARG VITE_API_BASE_URL=/api
ARG VITE_API_KEY=9589ca16aa2844de6975809fbac3891ef2a105eadcde6f56e044c60b6b774ec4

# 设置环境变量供构建使用
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_KEY=$VITE_API_KEY

# 构建生产版本
RUN npm run build

# 生产阶段 - 使用nginx提供静态文件服务
FROM nginx:alpine

# 安装必要的工具
RUN apk add --no-cache curl

# 复制构建产物到nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建必要的目录
RUN mkdir -p /var/log/nginx /var/cache/nginx /var/run

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"] 