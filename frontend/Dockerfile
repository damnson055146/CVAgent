FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 拷贝package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 拷贝源代码
COPY . .

# 构建应用
RUN npm run build

# 安装serve来运行构建后的应用
RUN npm install -g serve

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["serve", "-s", "dist", "-l", "3000"] 