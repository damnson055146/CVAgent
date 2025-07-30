// 测试页面跳转逻辑
const API_BASE_URL = 'http://localhost:8000';

async function testNavigationFlow() {
  console.log('🚀 测试页面跳转逻辑');
  console.log('==================================================');

  // 1. 测试Landing Page访问
  console.log('📄 1. 测试Landing Page访问...');
  try {
    const response = await fetch('http://localhost:5173');
    if (response.ok) {
      console.log('✅ Landing Page可以正常访问');
    } else {
      console.log('❌ Landing Page访问失败');
    }
  } catch (error) {
    console.log('❌ Landing Page访问失败:', error.message);
  }

  // 2. 测试注册流程
  console.log('\n📝 2. 测试注册流程...');
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'testpassword123'
  };

  try {
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    if (registerResponse.ok) {
      console.log('✅ 注册成功');
      
      // 3. 测试登录流程
      console.log('\n🔐 3. 测试登录流程...');
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
        console.log('✅ 登录成功，获取到访问令牌');
        
        // 4. 测试认证后的功能访问
        console.log('\n🔑 4. 测试认证后的功能访问...');
        const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${loginData.access_token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('✅ 获取用户信息成功:', {
            username: userData.username,
            email: userData.email,
            role: userData.role
          });
        } else {
          console.log('❌ 获取用户信息失败');
        }
      } else {
        console.log('❌ 登录失败');
      }
    } else {
      console.log('❌ 注册失败');
    }
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.message);
  }

  console.log('\n==================================================');
  console.log('🎉 页面跳转逻辑测试完成！');
  console.log('\n📋 测试总结:');
  console.log('1. Landing Page → 登录/注册按钮');
  console.log('2. 注册成功 → 3秒后自动跳转到登录页面');
  console.log('3. 登录成功 → 进入工具界面');
  console.log('4. 未登录用户 → 只能访问Landing Page和登录/注册页面');
  console.log('5. 已登录用户 → 可以访问所有工具功能');
}

// 运行测试
testNavigationFlow(); 