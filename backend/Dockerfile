
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 配置apt镜像源（中国）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
    && sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
         build-essential \
         libpq-dev \
         gcc \
         postgresql-client \
         curl \
    && rm -rf /var/lib/apt/lists/*

# 配置pip镜像源（中国）
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/ \
    && pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn

# 拷贝并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝应用代码
COPY main.py .
COPY app/ ./app
COPY env.example .env

# 等待数据库启动的脚本
COPY wait-for-db.sh .
RUN chmod +x wait-for-db.sh

# 暴露容器内端口
EXPOSE 8000

# 启动命令
CMD ["./wait-for-db.sh", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]