// 云函数: login
// 处理B站登录相关的云函数
exports.main = async (event, context) => {
  const { action, cookie, uid } = event;
  
  switch (action) {
    case 'login':
      return await handleLogin(event);
    case 'getUserInfo':
      return await getUserInfo(event);
    default:
      return {
        code: -1,
        message: '未知操作'
      };
  }
};

// 处理登录
async function handleLogin(event) {
  try {
    const { cookie } = event;
    
    if (!cookie) {
      return {
        code: -1,
        message: 'Cookie不能为空'
      };
    }
    
    // 验证Cookie格式
    if (!cookie.includes('SESSDATA') && !cookie.includes('bili_ticket')) {
      return {
        code: -1,
        message: 'Cookie格式不正确'
      };
    }
    
    // 从Cookie提取UID
    const uidMatch = cookie.match(/DedeUserID=([^;]+)/);
    const uid = uidMatch ? uidMatch[1] : '';
    
    return {
      code: 0,
      message: '登录成功',
      data: {
        uid,
        cookie,
        timestamp: Date.now()
      }
    };
    
  } catch (error) {
    console.error('登录处理失败:', error);
    return {
      code: -1,
      message: '登录处理失败: ' + error.message
    };
  }
}

// 获取用户信息
async function getUserInfo(event) {
  try {
    const { cookie } = event;
    
    if (!cookie) {
      return {
        code: -1,
        message: 'Cookie不能为空'
      };
    }
    
    // 这里可以调用B站API获取用户信息
    // 为了安全起见，在云函数中处理B站API调用
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        isLogin: true,
        timestamp: Date.now()
      }
    };
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      code: -1,
      message: '获取失败: ' + error.message
    };
  }
}
