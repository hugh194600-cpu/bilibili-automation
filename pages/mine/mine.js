// pages/mine/mine.js
const app = getApp();
const { showToast, showConfirm } = require('../../utils/util.js');

Page({
  data: {
    isLogin: false,
    userInfo: null,
    cacheSize: '0 KB',
    stats: {
      totalSignDays: 0,
      todayHangup: 0,
      totalHangup: 0
    }
  },

  onShow() {
    this.initData();
  },

  initData() {
    const isLogin = app.globalData.isLogin;
    const userInfo = app.globalData.userInfo || null;

    this.setData({
      isLogin,
      userInfo
    });

    this.calculateCacheSize();
    this.loadStats();
  },

  // 计算缓存大小
  calculateCacheSize() {
    try {
      const info = wx.getStorageInfoSync();
      const sizeKB = info.currentSize;
      let sizeStr = '';

      if (sizeKB > 1024) {
        sizeStr = (sizeKB / 1024).toFixed(2) + ' MB';
      } else {
        sizeStr = sizeKB + ' KB';
      }

      this.setData({ cacheSize: sizeStr });
    } catch (error) {
      console.error('计算缓存大小失败:', error);
    }
  },

  // 加载统计数据
  loadStats() {
    // 累计签到天数
    const signStatus = app.globalData.signStatus || {};
    const totalSignDays = signStatus.signDays || 0;

    // 今日挂机时长
    const today = new Date().toDateString();
    const hangupToday = wx.getStorageSync('hangup_today') || {};
    const todayHangup = hangupToday.date === today ? hangupToday.duration : 0;

    // 累计挂机时长
    const totalHangup = wx.getStorageSync('total_hangup') || 0;
    const totalHangupHours = Math.floor(totalHangup / 3600);

    this.setData({
      stats: {
        totalSignDays,
        todayHangup,
        totalHangup: totalHangupHours
      }
    });
  },

  // 跳转登录
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 退出登录
  async handleLogout() {
    const confirm = await showConfirm('提示', '确定要退出登录吗？');
    if (confirm) {
      app.logout();
      this.setData({
        isLogin: false,
        userInfo: null,
        stats: {
          totalSignDays: 0,
          todayHangup: 0,
          totalHangup: 0
        }
      });
      showToast('已退出登录', 'success');
    }
  },

  // 显示帮助
  showHelp() {
    wx.showModal({
      title: '使用帮助',
      content: '1. 如何获取Cookie？\n在B站网页版登录后，按F12打开开发者工具，在Network中找到任意请求，复制Request Headers中的Cookie内容。\n\n2. 挂机有什么限制？\n请确保Cookie有效，挂机过程中请保持小程序在后台运行。\n\n3. 签到有奖励吗？\n每日签到可获得直播经验值奖励。',
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#00A0E9'
    });
  },

  // 显示关于
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: 'B站弹幕宠物助手 v1.0.0\n\n本工具仅供学习交流使用，请勿用于商业目的。使用本工具产生的任何后果由使用者自行承担。\n\nB站弹幕宠物是B站的官方功能，本工具只是提供自动化辅助。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#00A0E9'
    });
  },

  // 清除缓存
  async clearCache() {
    const confirm = await showConfirm('提示', '确定要清除所有缓存数据吗？这不会影响登录状态。');
    if (confirm) {
      try {
        // 保留登录信息
        const cookie = wx.getStorageSync('bilibili_cookie');
        const userInfo = wx.getStorageSync('bilibili_userInfo');

        // 清除所有缓存
        wx.clearStorageSync();

        // 恢复登录信息
        if (cookie) wx.setStorageSync('bilibili_cookie', cookie);
        if (userInfo) wx.setStorageSync('bilibili_userInfo', userInfo);

        this.calculateCacheSize();
        showToast('缓存已清除', 'success');
      } catch (error) {
        console.error('清除缓存失败:', error);
        showToast('清除失败', 'none');
      }
    }
  }
});
