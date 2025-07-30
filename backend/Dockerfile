
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
         build-essential \
         libpq-dev \
         gcc \
         postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 拷贝并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝应用代码
COPY main.py .
COPY app/ ./app
COPY env.example .env

# 暴露容器内端口
EXPOSE 8000

# 等待数据库启动的脚本
COPY wait-for-db.sh .
RUN chmod +x wait-for-db.sh

# 启动命令
CMD ["./wait-for-db.sh", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]