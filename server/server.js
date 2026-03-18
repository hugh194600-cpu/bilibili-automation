/**
 * B站弹幕宠物后端API代理服务
 * 解决微信小程序跨域调用B站API的问题
 * 
 * 部署方式:
 * 1. Vercel: 直接部署
 * 2. Railway/Render: node server.js
 * 3. 腾讯云服务器: pm2 start server.js
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// B站API基础地址
const API_BASE = 'https://api.bilibili.com';
const LIVE_BASE = 'https://api.live.bilibili.com';

// 通用请求函数
async function biliRequest(url, options = {}) {
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://live.bilibili.com',
    'Origin': 'https://live.bilibili.com'
  };

  // 如果有Cookie，添加到请求头
  if (options.cookie) {
    defaultHeaders.Cookie = options.cookie;
  }

  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      data: options.data,
      headers: { ...defaultHeaders, ...options.headers },
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    console.error(`API请求失败: ${url}`, error.message);
    throw error;
  }
}

// ============ 用户相关API ============

// 获取用户信息
app.get('/api/user/info', async (req, res) => {
  try {
    const cookie = req.query.cookie || '';
    const result = await biliRequest(`${API_BASE}/x/web-interface/nav`, {
      cookie
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 验证Cookie有效性
app.get('/api/user/check', async (req, res) => {
  try {
    const cookie = req.query.cookie || '';
    const result = await biliRequest(`${API_BASE}/x/web-interface/nav`, {
      cookie
    });
    res.json({ 
      valid: result.code === 0 && result.data?.isLogin,
      data: result.data 
    });
  } catch (error) {
    res.json({ valid: false, message: error.message });
  }
});

// ============ 签到相关API ============

// 直播签到
app.post('/api/sign/signin', async (req, res) => {
  try {
    const { cookie } = req.body;
    const result = await biliRequest(`${API_BASE}/xlive/web-ucenter/v1/sign/DoSign`, {
      method: 'GET',
      cookie
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 获取签到状态
app.get('/api/sign/info', async (req, res) => {
  try {
    const cookie = req.query.cookie || '';
    const result = await biliRequest(`${API_BASE}/xlive/web-ucenter/v1/sign/GetSignInfo`, {
      method: 'GET',
      cookie
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// ============ 弹幕宠物API ============

// 获取宠物信息
app.get('/api/pet/info', async (req, res) => {
  try {
    const cookie = req.query.cookie || '';
    // 尝试多个可能的API端点
    try {
      const result = await biliRequest(`${API_BASE}/xlive/web-ucenter/v1/pet/info`, {
        method: 'GET',
        cookie
      });
      if (result.code === 0) {
        return res.json(result);
      }
    } catch (e) {
      console.log('尝试备选宠物API...');
    }
    
    // 备选API
    const result2 = await biliRequest(`${API_BASE}/xlive/pet/v1/pet/info`, {
      method: 'GET',
      cookie
    });
    res.json(result2);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 宠物签到
app.post('/api/pet/signin', async (req, res) => {
  try {
    const { cookie } = req.body;
    const csrf = extractCsrf(cookie);
    
    const result = await biliRequest(`${API_BASE}/x/pet/sign`, {
      method: 'POST',
      data: { csrf },
      cookie
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 开始挂机
app.post('/api/pet/hangup/start', async (req, res) => {
  try {
    const { cookie, roomId } = req.body;
    const csrf = extractCsrf(cookie);
    
    // 尝试多个API端点
    try {
      const result = await biliRequest(`${API_BASE}/xlive/web-ucenter/v1/pet/hangup/start`, {
        method: 'POST',
        data: { room_id: roomId, csrf },
        cookie
      });
      if (result.code === 0) {
        return res.json(result);
      }
    } catch (e) {
      console.log('尝试备选挂机API...');
    }
    
    // 备选API
    const result2 = await biliRequest(`${API_BASE}/xlive/pet/v1/pet/hangup/start`, {
      method: 'POST',
      data: { room_id: roomId, csrf },
      cookie
    });
    res.json(result2);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 结束挂机
app.post('/api/pet/hangup/stop', async (req, res) => {
  try {
    const { cookie } = req.body;
    const csrf = extractCsrf(cookie);
    
    try {
      const result = await biliRequest(`${API_BASE}/xlive/web-ucenter/v1/pet/hangup/end`, {
        method: 'POST',
        data: { csrf },
        cookie
      });
      if (result.code === 0) {
        return res.json(result);
      }
    } catch (e) {
      console.log('尝试备选停止挂机API...');
    }
    
    const result2 = await biliRequest(`${API_BASE}/xlive/pet/v1/pet/hangup/end`, {
      method: 'POST',
      data: { csrf },
      cookie
    });
    res.json(result2);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 获取挂机状态
app.get('/api/pet/hangup/status', async (req, res) => {
  try {
    const cookie = req.query.cookie || '';
    
    try {
      const result = await biliRequest(`${API_BASE}/xlive/web-ucenter/v1/pet/hangup/status`, {
        method: 'GET',
        cookie
      });
      if (result.code === 0) {
        return res.json(result);
      }
    } catch (e) {
      console.log('尝试备选挂机状态API...');
    }
    
    const result2 = await biliRequest(`${API_BASE}/xlive/pet/v1/pet/hangup/status`, {
      method: 'GET',
      cookie
    });
    res.json(result2);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// ============ 直播间相关API ============

// 获取直播间信息
app.get('/api/room/info', async (req, res) => {
  try {
    const roomId = req.query.roomId;
    const cookie = req.query.cookie || '';
    
    const result = await biliRequest(`${LIVE_BASE}/room/v1/Room/get_info`, {
      method: 'GET',
      data: { room_id: roomId },
      cookie
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 发送弹幕
app.post('/api/danmu/send', async (req, res) => {
  try {
    const { cookie, roomId, message } = req.body;
    const csrf = extractCsrf(cookie);
    
    const result = await biliRequest(`${LIVE_BASE}/msg/send`, {
      method: 'POST',
      data: {
        type: 'json',
        room_id: roomId,
        msg: message,
        csrf
      },
      cookie
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// 获取弹幕服务器配置
app.get('/api/danmu/conf', async (req, res) => {
  try {
    const roomId = req.query.roomId;
    const cookie = req.query.cookie || '';
    
    const result = await biliRequest(`${LIVE_BASE}/room/v1/Danmu/getConf`, {
      method: 'GET',
      data: { room_id: roomId },
      cookie
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: -1, message: error.message });
  }
});

// ============ 辅助函数 ============

// 从Cookie中提取CSRF token
function extractCsrf(cookie) {
  if (!cookie) return '';
  const match = cookie.match(/bili_jct=([^;]+)/);
  return match ? match[1] : '';
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`B站API代理服务运行在端口 ${PORT}`);
  console.log(`部署到公网后，将URL配置到小程序中即可解决跨域问题`);
});

module.exports = app;
