/**
 * B站API封装
 * 支持两种模式:
 * 1. 直接调用B站API（可能被跨域限制）
 * 2. 通过后端代理服务器调用（解决跨域问题）
 */
const cloudConfig = require('./cloud-config.js');

const API_BASE = 'https://api.bilibili.com';
const LIVE_BASE = 'https://api.live.bilibili.com';

// 获取API基础地址
function getApiBase() {
  const app = getApp();
  if (app && app.globalData.useProxy && app.globalData.apiBaseUrl) {
    return app.globalData.apiBaseUrl;
  }
  // 如果未配置代理，使用本地模拟
  return '';
}

/**
 * 发起请求 - 直接调用B站API
 */
function request(url, options = {}) {
  const app = getApp();
  const cookie = app.globalData.cookie || wx.getStorageSync('bilibili_cookie') || '';

  console.log(`发起API请求: ${url}`);
  console.log('Cookie状态:', cookie ? '有效' : '无效');

  const defaultOptions = {
    header: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://live.bilibili.com',
      'Cookie': cookie
    },
    timeout: 15000
  };

  const mergedOptions = { ...defaultOptions, ...options };
  if (mergedOptions.header) {
    mergedOptions.header.Cookie = cookie;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      ...mergedOptions,
      success: (res) => {
        console.log(`API响应: ${url}`, {
          statusCode: res.statusCode,
          data: res.data
        });
        
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          console.error(`API请求失败: ${url}`, res);
          reject(res);
        }
      },
      fail: (err) => {
        console.error(`API网络错误: ${url}`, err);
        reject(err);
      }
    });
  });
}

/**
 * 通过后端代理服务器请求
 */
function proxyRequest(endpoint, options = {}) {
  const app = getApp();
  const cookie = app.globalData.cookie || wx.getStorageSync('bilibili_cookie') || '';
  const baseUrl = getApiBase();
  
  if (!baseUrl) {
    console.log('未配置后端API代理');
    return Promise.reject(new Error('未配置后端API'));
  }

  const url = `${baseUrl}${endpoint}`;
  console.log(`发起代理请求: ${url}`);

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      timeout: 20000,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 统一API请求入口
 * 优先使用代理服务器，失败则回退到直接调用
 */
async function apiRequest(path, options = {}) {
  const app = getApp();
  const useProxy = app.globalData.useProxy && app.globalData.apiBaseUrl;
  
  if (useProxy) {
    try {
      const result = await proxyRequest(path, options);
      if (result.code === 0) {
        return result.data || result;
      }
      // 代理返回错误，尝试直接调用
      console.log('代理API返回错误，尝试直接调用');
    } catch (error) {
      console.log('代理请求失败，尝试直接调用:', error.message);
    }
  }
  
  // 回退到直接调用
  const fullUrl = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return request(fullUrl, options);
}

/**
 * 获取用户信息
 */
async function getUserInfo() {
  try {
    const res = await apiRequest('/api/user/info', {
      method: 'GET',
      data: { cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

/**
 * 直播签到
 */
async function liveSignIn() {
  try {
    const res = await apiRequest('/api/sign/signin', {
      method: 'POST',
      data: { cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('签到失败:', error);
    throw error;
  }
}

/**
 * 获取签到状态
 */
async function getSignInfo() {
  try {
    const res = await apiRequest('/api/sign/info', {
      method: 'GET',
      data: { cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('获取签到信息失败:', error);
    throw error;
  }
}

/**
 * 获取直播间信息
 */
async function getRoomInfo(roomId) {
  try {
    const res = await apiRequest('/api/room/info', {
      method: 'GET',
      data: { roomId, cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('获取直播间信息失败:', error);
    throw error;
  }
}

/**
 * 发送弹幕
 */
async function sendDanmu(roomId, message) {
  try {
    const res = await apiRequest('/api/danmu/send', {
      method: 'POST',
      data: {
        cookie: getApp().globalData.cookie,
        roomId,
        message
      }
    });
    return res.code === 0;
  } catch (error) {
    console.error('发送弹幕失败:', error);
    return false;
  }
}

/**
 * 获取CSRF Token
 */
function getCsrf() {
  const cookie = getApp().globalData.cookie || wx.getStorageSync('bilibili_cookie') || '';
  let matches = cookie.match(/bili_jct=([^;]+)/);
  if (matches) return matches[1];
  return '';
}

/**
 * 获取弹幕服务器配置
 */
async function getDanmuConf(roomId) {
  try {
    const res = await apiRequest('/api/danmu/conf', {
      method: 'GET',
      data: { roomId, cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('获取弹幕配置失败:', error);
    throw error;
  }
}

/**
 * 获取用户直播间列表
 */
async function getMyLiveRooms() {
  try {
    const res = await apiRequest('/xlive/web-ucenter/v1/live_anchor/GetInfo', {
      method: 'GET'
    });
    if (res.code === 0) {
      return res.data.list || [];
    }
    return [];
  } catch (error) {
    console.error('获取直播间列表失败:', error);
    return [];
  }
}

/**
 * 检查Cookie有效性
 */
async function checkCookieValid() {
  try {
    const userInfo = await getUserInfo();
    return userInfo && userInfo.isLogin === true;
  } catch (error) {
    return false;
  }
}

/**
 * 获取弹幕宠物信息
 */
async function getPetInfo() {
  try {
    const res = await apiRequest('/api/pet/info', {
      method: 'GET',
      data: { cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('获取弹幕宠物信息失败:', error);
    return null;
  }
}

/**
 * 弹幕宠物签到
 */
async function petSignIn() {
  try {
    const res = await apiRequest('/api/pet/signin', {
      method: 'POST',
      data: { cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('宠物签到失败:', error);
    throw error;
  }
}

/**
 * 弹幕宠物开始挂机
 */
async function startPetHangup(roomId) {
  try {
    const res = await apiRequest('/api/pet/hangup/start', {
      method: 'POST',
      data: {
        cookie: getApp().globalData.cookie,
        roomId
      }
    });
    return res;
  } catch (error) {
    console.error('开始挂机失败:', error);
    throw error;
  }
}

/**
 * 弹幕宠物结束挂机
 */
async function stopPetHangup() {
  try {
    const res = await apiRequest('/api/pet/hangup/stop', {
      method: 'POST',
      data: { cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('结束挂机失败:', error);
    throw error;
  }
}

/**
 * 获取挂机状态
 */
async function getHangupStatus() {
  try {
    const res = await apiRequest('/api/pet/hangup/status', {
      method: 'GET',
      data: { cookie: getApp().globalData.cookie }
    });
    return res;
  } catch (error) {
    console.error('获取挂机状态失败:', error);
    return null;
  }
}

/**
 * 获取投食历史
 */
async function getFeedHistory() {
  try {
    const res = await apiRequest('/x/pet/feed/list', {
      method: 'GET'
    });
    if (res.code === 0) {
      return res.data.list || [];
    }
    return [];
  } catch (error) {
    console.error('获取投食历史失败:', error);
    return [];
  }
}

module.exports = {
  request,
  proxyRequest,
  apiRequest,
  getUserInfo,
  liveSignIn,
  getSignInfo,
  getRoomInfo,
  sendDanmu,
  getDanmuConf,
  getMyLiveRooms,
  checkCookieValid,
  getPetInfo,
  petSignIn,
  startPetHangup,
  stopPetHangup,
  getHangupStatus,
  getFeedHistory,
  getCsrf,
  getApiBase
};
