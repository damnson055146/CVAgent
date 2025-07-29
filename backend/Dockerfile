
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
         build-essential \
    && rm -rf /var/lib/apt/lists/*

# 拷贝并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝环境变量文件
COPY .env .

# 拷贝应用代码
COPY main.py .
COPY app/ ./app

# 暴露容器内端口（与 Uvicorn 启动端口一致）
EXPOSE 8000

# 默认启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]