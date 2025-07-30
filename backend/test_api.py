#!/usr/bin/env python3
"""
自动化测试脚本 - 测试登录注册鉴权和文件管理功能
"""

import requests
import json
import time
from typing import Dict, Any

# 配置
BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/auth"
DOC_BASE_URL = f"{BASE_URL}/documents"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        # 使用时间戳生成唯一用户名
        timestamp = int(time.time())
        self.user_data = {
            "username": f"testuser_{timestamp}",
            "email": f"test_{timestamp}@example.com",
            "password": "testpassword123"
        }
        
    def print_test(self, test_name: str, success: bool, message: str = "", response_data: str = ""):
        """打印测试结果"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        if response_data:
            print(f"   响应: {response_data}")
        print()
        
    def test_health_check(self):
        """测试健康检查"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            success = response.status_code == 200
            self.print_test("健康检查", success, f"状态码: {response.status_code}")
            return success
        except Exception as e:
            self.print_test("健康检查", False, f"错误: {str(e)}")
            return False
            
    def test_register(self):
        """测试用户注册"""
        try:
            response = self.session.post(
                f"{API_BASE_URL}/register",
                json=self.user_data
            )
            success = response.status_code == 200
            response_text = response.text
            self.print_test("用户注册", success, f"状态码: {response.status_code}", response_text)
            if success:
                print(f"   注册用户: {self.user_data['username']}")
            return success
        except Exception as e:
            self.print_test("用户注册", False, f"错误: {str(e)}")
            return False
            
    def test_login(self):
        """测试用户登录"""
        try:
            response = self.session.post(
                f"{API_BASE_URL}/login",
                data={
                    "username": self.user_data["email"],
                    "password": self.user_data["password"]
                }
            )
            success = response.status_code == 200
            response_text = response.text
            self.print_test("用户登录", success, f"状态码: {response.status_code}", response_text)
            
            if success:
                data = response.json()
                self.access_token = data.get("access_token")
                print(f"   获取访问令牌: {'成功' if self.access_token else '失败'}")
                
                # 设置cookie
                if "access_token" in response.cookies:
                    self.session.cookies.set("access_token", response.cookies["access_token"])
                    
            return success
        except Exception as e:
            self.print_test("用户登录", False, f"错误: {str(e)}")
            return False
            
    def test_get_user_info(self):
        """测试获取用户信息"""
        try:
            response = self.session.get(f"{API_BASE_URL}/me")
            success = response.status_code == 200
            response_text = response.text
            self.print_test("获取用户信息", success, f"状态码: {response.status_code}", response_text)
            
            if success:
                user_info = response.json()
                print(f"   用户信息: {user_info.get('username', 'N/A')} ({user_info.get('email', 'N/A')})")
                
            return success
        except Exception as e:
            self.print_test("获取用户信息", False, f"错误: {str(e)}")
            return False
            
    def test_upload_resume(self):
        """测试上传简历文档"""
        try:
            # 创建测试简历内容
            resume_content = """
# 测试简历

## 个人信息
- 姓名: 测试用户
- 邮箱: test@example.com
- 电话: 123-456-7890

## 教育背景
- 大学: 测试大学
- 专业: 计算机科学
- 学位: 学士

## 工作经验
- 公司: 测试公司
- 职位: 软件工程师
- 时间: 2020-2023

## 技能
- 编程语言: Python, JavaScript, Java
- 框架: React, Django, Spring
- 数据库: MySQL, PostgreSQL, MongoDB
            """
            
            # 准备FormData
            files = {
                'doc_type': (None, 'resume'),
                'title': (None, '我的测试简历'),
                'content': (None, resume_content),
                'content_format': (None, 'markdown')
            }
            
            response = self.session.post(
                f"{DOC_BASE_URL}/upload",
                files=files
            )
            
            success = response.status_code == 200
            response_text = response.text
            self.print_test("上传简历文档", success, f"状态码: {response.status_code}", response_text)
            
            if success:
                data = response.json()
                print(f"   文档ID: {data.get('id', 'N/A')}")
                print(f"   文档标题: {data.get('title', 'N/A')}")
                
            return success
        except Exception as e:
            self.print_test("上传简历文档", False, f"错误: {str(e)}")
            return False
            
    def test_get_resume_list(self):
        """测试获取简历列表"""
        try:
            response = self.session.get(f"{DOC_BASE_URL}/resume")
            success = response.status_code == 200
            response_text = response.text
            self.print_test("获取简历列表", success, f"状态码: {response.status_code}", response_text)
            
            if success:
                data = response.json()
                print(f"   简历数量: {len(data)}")
                for doc in data:
                    print(f"   - {doc.get('title', 'N/A')} (ID: {doc.get('id', 'N/A')})")
                    
            return success
        except Exception as e:
            self.print_test("获取简历列表", False, f"错误: {str(e)}")
            return False
            
    def test_get_resume_detail(self, doc_id: str):
        """测试获取简历详情"""
        try:
            response = self.session.get(f"{DOC_BASE_URL}/resume/{doc_id}")
            success = response.status_code == 200
            response_text = response.text
            self.print_test("获取简历详情", success, f"状态码: {response.status_code}", response_text)
            
            if success:
                data = response.json()
                print(f"   文档标题: {data.get('title', 'N/A')}")
                print(f"   版本数量: {len(data.get('versions', []))}")
                
            return success
        except Exception as e:
            self.print_test("获取简历详情", False, f"错误: {str(e)}")
            return False
            
    def test_add_resume_version(self, doc_id: str):
        """测试添加简历版本"""
        try:
            # 创建新版本的简历内容
            new_content = """
# 更新后的测试简历

## 个人信息
- 姓名: 测试用户
- 邮箱: test@example.com
- 电话: 123-456-7890

## 教育背景
- 大学: 测试大学
- 专业: 计算机科学
- 学位: 学士

## 工作经验
- 公司: 测试公司
- 职位: 高级软件工程师
- 时间: 2020-2023

## 技能
- 编程语言: Python, JavaScript, Java, Go
- 框架: React, Django, Spring, Gin
- 数据库: MySQL, PostgreSQL, MongoDB, Redis
- 云服务: AWS, Docker, Kubernetes
            """
            
            files = {
                'content': (None, new_content),
                'content_format': (None, 'markdown')
            }
            
            response = self.session.post(
                f"{DOC_BASE_URL}/resume/{doc_id}/versions",
                files=files
            )
            
            success = response.status_code == 200
            response_text = response.text
            self.print_test("添加简历版本", success, f"状态码: {response.status_code}", response_text)
            
            if success:
                data = response.json()
                print(f"   新版本号: {data.get('version_number', 'N/A')}")
                
            return success
        except Exception as e:
            self.print_test("添加简历版本", False, f"错误: {str(e)}")
            return False
            
    def test_logout(self):
        """测试用户登出"""
        try:
            response = self.session.post(f"{API_BASE_URL}/logout")
            success = response.status_code == 200
            response_text = response.text
            self.print_test("用户登出", success, f"状态码: {response.status_code}", response_text)
            return success
        except Exception as e:
            self.print_test("用户登出", False, f"错误: {str(e)}")
            return False
            
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始自动化API测试")
        print("=" * 50)
        
        # 测试健康检查
        if not self.test_health_check():
            print("❌ 健康检查失败，停止测试")
            return
            
        # 测试注册
        self.test_register()
        
        # 测试登录
        if not self.test_login():
            print("❌ 登录失败，停止测试")
            return
            
        # 测试获取用户信息
        self.test_get_user_info()
        
        # 测试文档管理
        print("📄 测试文档管理功能")
        print("-" * 30)
        
        # 上传简历
        if self.test_upload_resume():
            # 获取简历列表
            self.test_get_resume_list()
            
            # 获取第一个简历的详情
            response = self.session.get(f"{DOC_BASE_URL}/resume")
            if response.status_code == 200:
                resumes = response.json()
                if resumes:
                    doc_id = resumes[0]["id"]
                    self.test_get_resume_detail(doc_id)
                    self.test_add_resume_version(doc_id)
        
        # 测试登出
        self.test_logout()
        
        print("=" * 50)
        print("🎉 自动化测试完成！")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests() 