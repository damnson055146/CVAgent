#!/bin/bash

# 数据库初始化脚本
# 用于在部署时初始化PostgreSQL数据库

set -e

echo "🚀 开始初始化数据库..."

# 等待PostgreSQL启动
echo "⏳ 等待PostgreSQL启动..."
until pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER; do
  echo "PostgreSQL不可用，等待..."
  sleep 2
done

echo "✅ PostgreSQL已启动"

# 创建数据库（如果不存在）
echo "📦 创建数据库..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'" | grep -q 1 || psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d postgres -c "CREATE DATABASE $POSTGRES_DB"

echo "✅ 数据库创建完成"

# 执行SQL初始化脚本
echo "📝 执行数据库初始化脚本..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f /app/config/sql_postgre/init.sql

echo "✅ 数据库初始化完成"
