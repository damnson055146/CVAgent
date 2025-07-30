// 前端交互测试脚本
const API_BASE_URL = 'http://localhost:8000';

// 测试用户数据
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'testpassword123'
};

async function testFrontendBackendInteraction() {
  console.log('🚀 开始前端后端交互测试');
  console.log('==================================================');

  try {
    // 1. 测试注册
    console.log('📝 测试用户注册...');
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ 注册成功:', registerData);
    } else {
      const error = await registerResponse.json();
      console.log('❌ 注册失败:', error);
      return;
    }

    // 2. 测试登录
    console.log('\n🔐 测试用户登录...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUser.email,
        password: testUser.password
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ 登录成功:', {
        access_token: loginData.access_token ? '已获取' : '未获取',
        user_id: loginData.user_id,
        username: loginData.username
      });

      // 3. 测试获取用户信息
      console.log('\n👤 测试获取用户信息...');
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${loginData.access_token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ 获取用户信息成功:', {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role
        });
      } else {
        console.log('❌ 获取用户信息失败');
      }

      // 4. 测试文档上传
      console.log('\n📄 测试文档上传...');
      const testResumeContent = `
# 测试简历

## 个人信息
- 姓名: 测试用户
- 邮箱: ${testUser.email}
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
      `.trim();

      const formData = new FormData();
      formData.append('doc_type', 'resume');
      formData.append('title', '测试简历');
      formData.append('content', testResumeContent);
      formData.append('content_format', 'markdown');

      const uploadResponse = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginData.access_token}`,
        },
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        console.log('✅ 文档上传成功:', {
          id: uploadData.id,
          title: uploadData.title,
          type: uploadData.type
        });

        // 5. 测试获取文档列表
        console.log('\n📋 测试获取文档列表...');
        const listResponse = await fetch(`${API_BASE_URL}/documents/resume`, {
          headers: {
            'Authorization': `Bearer ${loginData.access_token}`,
          },
        });

        if (listResponse.ok) {
          const listData = await listResponse.json();
          console.log('✅ 获取文档列表成功:', {
            count: listData.length,
            documents: listData.map(doc => ({ id: doc.id, title: doc.title }))
          });
        } else {
          console.log('❌ 获取文档列表失败');
        }
      } else {
        console.log('❌ 文档上传失败');
      }

      // 6. 测试登出
      console.log('\n🚪 测试用户登出...');
      const logoutResponse = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginData.access_token}`,
        },
      });

      if (logoutResponse.ok) {
        console.log('✅ 登出成功');
      } else {
        console.log('❌ 登出失败');
      }

    } else {
      const error = await loginResponse.json();
      console.log('❌ 登录失败:', error);
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }

  console.log('\n==================================================');
  console.log('🎉 前端后端交互测试完成！');
}

// 运行测试
testFrontendBackendInteraction(); 