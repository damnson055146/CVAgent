#!/bin/bash

# CVAgent后端部署脚本
# 用于在新服务器上部署完整的CVAgent后端服务

set -e

echo "🚀 开始部署CVAgent后端服务..."

# 检查Docker和Docker Compose是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "⚠️  未找到.env文件，请确保已配置环境变量"
    echo "📝 请参考env.example文件创建.env文件"
    exit 1
fi

# 创建日志目录
echo "📁 创建日志目录..."
mkdir -p logs

# 停止现有服务（如果存在）
echo "🛑 停止现有服务..."
docker-compose down --remove-orphans || true

# 清理旧镜像（可选）
echo "🧹 清理旧镜像..."
docker system prune -f

# 构建新镜像
echo "🔨 构建Docker镜像..."
docker-compose build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 检查健康状态
echo "🏥 检查健康状态..."
for i in {1..10}; do
    if curl -f http://localhost:8699/health > /dev/null 2>&1; then
        echo "✅ 后端服务健康检查通过"
        break
    else
        echo "⏳ 等待后端服务启动... ($i/10)"
        sleep 10
    fi
done

# 检查数据库连接
echo "🗄️  检查数据库连接..."
docker-compose exec -T backend python -c "
import asyncio
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

async def test_db():
    try:
        async for db in get_db():
            await db.execute('SELECT 1')
            print('✅ 数据库连接正常')
            break
    except Exception as e:
        print(f'❌ 数据库连接失败: {e}')
        exit(1)

asyncio.run(test_db())
"

# 检查Redis连接
echo "🔴 检查Redis连接..."
docker-compose exec -T redis redis-cli ping

echo "🎉 部署完成！"
echo ""
echo "📊 服务信息："
echo "   - 后端API: http://localhost:8699"
echo "   - API文档: http://localhost:8699/docs"
echo "   - 健康检查: http://localhost:8699/health"
echo "   - 数据库: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "📝 查看日志："
echo "   - docker-compose logs -f backend"
echo "   - docker-compose logs -f postgres"
echo "   - docker-compose logs -f redis"
echo ""
echo "🛑 停止服务："
echo "   - docker-compose down"
