#!/bin/bash

# 头脑风暴Agent服务启动脚本

echo "🚀 启动头脑风暴Agent服务..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python3"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📥 安装依赖..."
pip install -r requirements.txt

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到.env文件，复制示例文件..."
    cp env.example .env
    echo "📝 请编辑.env文件配置相关参数"
fi

# 启动服务
echo "🎯 启动服务..."
python main.py
