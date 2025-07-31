import requests
import json

def test_backend_connection():
    """测试后端连接状态"""
    try:
        # 测试健康检查接口
        response = requests.get('http://127.0.0.1:8000/')
        print(f"健康检查状态: {response.status_code}")
        print(f"响应内容: {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务器 (端口8000)")
        return False
    except Exception as e:
        print(f"❌ 连接错误: {e}")
        return False

def test_parse_resume():
    """测试简历解析接口"""
    try:
        # 测试文本解析接口
        test_data = {
            "text": "张三\n电话：13800138000\n邮箱：zhangsan@example.com\n教育背景：北京大学计算机科学学士"
        }
        
        response = requests.post(
            'http://127.0.0.1:8000/parse-resume-text/',
            headers={'Content-Type': 'application/json'},
            json=test_data
        )
        print(f"简历解析状态: {response.status_code}")
        if response.status_code == 200:
            print("✅ 简历解析接口正常")
        else:
            print(f"❌ 简历解析失败: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 测试简历解析时出错: {e}")
        return False

if __name__ == "__main__":
    print("🔍 测试后端连接...")
    
    if test_backend_connection():
        print("✅ 后端服务器正在运行")
        test_parse_resume()
    else:
        print("❌ 后端服务器未运行，请启动后端服务")
        print("💡 启动命令: cd backend && python main.py") 