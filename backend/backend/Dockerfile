
FROM python:3.11-slim

WORKDIR /app

RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/wait-for-db.sh

ENTRYPOINT ["/app/wait-for-db.sh"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8699"]