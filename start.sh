#!/bin/bash

echo "🚀 启动 CV Agent 项目..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

# 检查 docker-compose 是否可用
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose 未安装"
    exit 1
fi

echo "✅ Docker 环境检查通过"

# 构建并启动服务
echo "🔨 构建并启动服务..."
if command -v docker-compose &> /dev/null; then
    docker-compose up --build -d
else
    docker compose up --build -d
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 服务状态："
if command -v docker-compose &> /dev/null; then
    docker-compose ps
else
    docker compose ps
fi

echo ""
echo "🎉 启动完成！"
echo "📱 前端应用: http://localhost"
echo "🔧 后端API: http://localhost:8699"
echo "🗄️ 数据库: localhost:5400"
echo ""
echo "📋 常用命令："
echo "  查看日志: docker compose logs -f"
echo "  停止服务: docker compose down"
echo "  重启服务: docker compose restart"
