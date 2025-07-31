#!/usr/bin/env python3
import requests
import time
import sys
import json

def print_test(test_name, success, status_code=None, response=None, error=None):
    """打印测试结果"""
    if success:
        print(f"✅ PASS {test_name}")
        if status_code:
            print(f"   状态码: {status_code}")
        if response:
            print(f"   响应: {response}")
    else:
        print(f"❌ FAIL {test_name}")
        if status_code:
            print(f"   状态码: {status_code}")
        if response:
            print(f"   响应: {response}")
        if error:
            print(f"   错误: {error}")

def test_health_check():
    """测试健康检查"""
    try:
        response = requests.get("http://localhost:8700/", timeout=10)
        return True, response.status_code, response.json()
    except requests.exceptions.RequestException as e:
        return False, None, None, str(e)

def test_register():
    """测试用户注册"""
    try:
        import time
        timestamp = int(time.time())
        data = {
            "username": f"testuser{timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpassword123"
        }
        response = requests.post("http://localhost:8700/auth/register", json=data, timeout=10)
        return response.status_code == 200, response.status_code, response.json()
    except requests.exceptions.RequestException as e:
        return False, None, None, str(e)

def test_login():
    """测试用户登录"""
    try:
        import time
        timestamp = int(time.time())
        data = {
            "username": f"testuser{timestamp}",
            "password": "testpassword123"
        }
        response = requests.post("http://localhost:8700/auth/login", data=data, timeout=10)
        return response.status_code == 200, response.status_code, response.json()
    except requests.exceptions.RequestException as e:
        return False, None, None, str(e)

def test_frontend():
    """测试前端服务"""
    try:
        response = requests.get("http://localhost:3000/", timeout=10)
        return response.status_code == 200, response.status_code, "Frontend is running"
    except requests.exceptions.RequestException as e:
        return False, None, None, str(e)

def main():
    print("🚀 开始Docker环境测试")
    print("=" * 50)
    
    # 等待服务启动
    print("等待服务启动...")
    time.sleep(10)
    
    # 测试后端健康检查
    success, status_code, response, error = test_health_check()
    print_test("后端健康检查", success, status_code, response, error)
    if not success:
        print("❌ 后端服务未启动，停止测试")
        return
    
    # 测试用户注册
    success, status_code, response, error = test_register()
    print_test("用户注册", success, status_code, response, error)
    if not success:
        print("❌ 用户注册失败，停止测试")
        return
    
    # 测试用户登录
    success, status_code, response, error = test_login()
    print_test("用户登录", success, status_code, response, error)
    if not success:
        print("❌ 用户登录失败，停止测试")
        return
    
    # 测试前端服务
    success, status_code, response, error = test_frontend()
    print_test("前端服务", success, status_code, response, error)
    
    print("\n🎉 Docker环境测试完成！")
    print("前端地址: http://localhost:3000")
    print("后端地址: http://localhost:8700")
    print("数据库地址: localhost:5400")

if __name__ == "__main__":
    main() 