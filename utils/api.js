/**
 * API请求统一封装
 * 支持后端代理和直接调用两种模式
 */

const cloudConfig = require('./cloud-config.js');

// 默认配置
const DEFAULT_CONFIG = {
  baseURL: cloudConfig.API_BASE_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * 统一请求处理
 * @param {string} url 请求地址（相对路径或完整URL）
 * @param {object} options 请求选项
 * @returns {Promise}
 */
function request(url, options = {}) {
  const app = getApp();
  const cookie = app.globalData.cookie || wx.getStorageSync('bilibili_cookie') || '';
  
  // 合并配置
  const config = {
    url,
    method: options.method || 'GET',
    data: options.data || {},
    header: {
      ...DEFAULT_CONFIG.headers,
      ...options.header
    },
    timeout: options.timeout || DEFAULT_CONFIG.timeout
  };

  // 添加认证信息
  if (cookie) {
    config.header.Cookie = cookie;
  }

  // 如果是相对路径且配置了代理，使用完整URL
  if (!url.startsWith('http') && cloudConfig.USE_PROXY && cloudConfig.API_BASE_URL) {
    config.url = cloudConfig.API_BASE_URL + url;
  }

  console.log(`[API Request] ${config.method} ${config.url}`);
  if (cookie) {
    console.log('[API Request] Cookie:', cookie.substring(0, 50) + '...');
  }

  return new Promise((resolve, reject) => {
    wx.request({
      ...config,
      success: (res) => {
        console.log(`[API Response] ${config.url}`, {
          statusCode: res.statusCode,
          data: res.data
        });

        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 检查业务状态码
          if (res.data && res.data.code !== undefined) {
            if (res.data.code === 0) {
              resolve(res.data);
            } else {
              reject({
                code: res.data.code,
                message: res.data.message || '请求失败',
                data: res.data
              });
            }
          } else {
            resolve(res.data);
          }
        } else {
          reject({
            code: res.statusCode,
            message: `HTTP ${res.statusCode}`,
            data: res.data
          });
        }
      },
      fail: (err) => {
        console.error(`[API Error] ${config.url}`, err);
        reject({
          code: -1,
          message: err.errMsg || '网络请求失败',
          detail: err
        });
      }
    });
  });
}

/**
 * GET请求
 */
function get(url, params = {}, options = {}) {
  return request(url, {
    ...options,
    method: 'GET',
    data: params
  });
}

/**
 * POST请求
 */
function post(url, data = {}, options = {}) {
  return request(url, {
    ...options,
    method: 'POST',
    data
  });
}

/**
 * 上传文件
 */
function uploadFile(url, filePath, name = 'file', formData = {}) {
  const app = getApp();
  const cookie = app.globalData.cookie || wx.getStorageSync('bilibili_cookie') || '';
  
  console.log(`[Upload] ${url}`);
  
  return new Promise((resolve, reject) => {
    const task = wx.uploadFile({
      url: cloudConfig.USE_PROXY ? cloudConfig.API_BASE_URL + url : url,
      filePath,
      name,
      formData,
      header: {
        'Cookie': cookie
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          console.log('[Upload Success]', data);
          resolve(data);
        } catch (e) {
          console.error('[Upload Parse Error]', e);
          reject({
            code: -1,
            message: '解析响应失败',
            detail: e
          });
        }
      },
      fail: (err) => {
        console.error('[Upload Error]', err);
        reject({
          code: -1,
          message: err.errMsg || '上传失败',
          detail: err
        });
      }
    });

    // 返回上传任务，支持进度监听
    return task;
  });
}

/**
 * 下载文件
 */
function downloadFile(url, options = {}) {
  console.log(`[Download] ${url}`);
  
  return new Promise((resolve, reject) => {
    const task = wx.downloadFile({
      url,
      ...options,
      success: (res) => {
        if (res.statusCode === 200) {
          console.log('[Download Success]', res.tempFilePath);
          resolve(res);
        } else {
          reject({
            code: res.statusCode,
            message: `HTTP ${res.statusCode}`
          });
        }
      },
      fail: (err) => {
        console.error('[Download Error]', err);
        reject({
          code: -1,
          message: err.errMsg || '下载失败',
          detail: err
        });
      }
    });

    // 返回下载任务，支持进度监听
    return task;
  });
}

module.exports = {
  request,
  get,
  post,
  uploadFile,
  downloadFile,
  DEFAULT_CONFIG
};