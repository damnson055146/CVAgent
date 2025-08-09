FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 拷贝package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --no-audit --no-fund

# 拷贝源代码
COPY . .

# 构建生产版本
RUN npm run build

# 安装serve来提供静态文件服务
RUN npm install -g serve

# 暴露端口
EXPOSE 80

# 启动生产服务器
CMD ["serve", "-s", "dist", "-l", "80"] 