/**
 * 工具函数
 */

/**
 * 格式化时间
 * @param {number} timestamp 时间戳
 * @param {string} format 格式
 * @returns {string}
 */
function formatTime(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 格式化时长
 * @param {number} seconds 秒数
 * @returns {string}
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0秒';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let result = '';
  if (hours > 0) result += `${hours}小时`;
  if (minutes > 0) result += `${minutes}分钟`;
  if (secs > 0 || result === '') result += `${secs}秒`;
  return result;
}

/**
 * 获取今天的开始时间戳
 * @returns {number}
 */
function getTodayStartTimestamp() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/**
 * 检查是否是同一天
 * @param {number} timestamp1
 * @param {number} timestamp2
 * @returns {boolean}
 */
function isSameDay(timestamp1, timestamp2) {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 检查今天是否已签到
 * @param {object} signStatus 签到状态
 * @returns {boolean}
 */
function isSignedToday(signStatus) {
  if (!signStatus || !signStatus.lastSignTime) return false;
  const todayStart = getTodayStartTimestamp();
  return signStatus.lastSignTime >= todayStart;
}

/**
 * 显示Toast提示
 * @param {string} title 提示内容
 * @param {string} icon 图标 success/error/loading/none
 */
function showToast(title, icon = 'none') {
  wx.showToast({
    title,
    icon,
    duration: 2000
  });
}

/**
 * 显示Loading
 * @param {string} title 加载提示
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

/**
 * 隐藏Loading
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示确认对话框
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>}
 */
function showConfirm(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
}

/**
 * 解析Cookie字符串为对象
 * @param {string} cookieStr Cookie字符串
 * @returns {object}
 */
function parseCookie(cookieStr) {
  if (!cookieStr) return {};
  const cookieObj = {};
  const cookies = cookieStr.split(';');
  cookies.forEach((item) => {
    const [key, value] = item.trim().split('=');
    if (key) {
      cookieObj[key] = value;
    }
  });
  return cookieObj;
}

/**
 * 生成随机字符串
 * @param {number} length 长度
 * @returns {string}
 */
function randomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 深拷贝
 * @param {any} obj 对象
 * @returns {any}
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

module.exports = {
  formatTime,
  formatDuration,
  getTodayStartTimestamp,
  isSameDay,
  isSignedToday,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  parseCookie,
  randomString,
  deepClone
};
