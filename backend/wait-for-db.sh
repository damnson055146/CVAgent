#!/bin/bash

# 等待PostgreSQL数据库启动
echo "等待PostgreSQL数据库启动..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "数据库未就绪，等待..."
  sleep 2
done

echo "数据库已就绪，启动应用..."

# 执行传入的命令
exec "$@" 