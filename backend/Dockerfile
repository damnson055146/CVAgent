
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
         build-essential \
         libpq-dev \
         gcc \
         postgresql-client \
          curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 拷贝并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 拷贝应用代码
COPY main.py .
COPY app/ ./app
# 将示例环境复制为容器内默认 .env（实际部署时由 docker-compose 的 env_file/environment 覆盖）
COPY env.example .env

# 等待数据库启动的脚本
COPY wait-for-db.sh .
RUN chmod +x wait-for-db.sh

# 创建非root用户（可选，提高安全性）
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 暴露容器内端口
EXPOSE 8699

# 启动命令（生产不建议 --reload）
ENTRYPOINT ["/bin/sh", "-lc"]
CMD ["./wait-for-db.sh uvicorn main:app --host 0.0.0.0 --port 8699"]