// app.js
// 引入云开发配置
const cloudConfig = require('./utils/cloud-config.js');

App({
  globalData: {
    userInfo: null,
    cookie: '',
    uid: '',
    isLogin: false,
    // 挂机状态
    isHanging: false,
    hangupRoomId: '',
    hangupStartTime: 0,
    // 在线状态
    isOnline: false,
    onlineStartTime: 0,
    // WebSocket连接
    ws: null,
    // 签到状态
    signStatus: {
      signed: false,
      lastSignTime: 0,
      signDays: 0
    },
    // 云开发环境
    cloudEnv: cloudConfig.CLOUD_ENV,
    // 后端API地址
    apiBaseUrl: cloudConfig.API_BASE_URL,
    // 是否使用代理
    useProxy: cloudConfig.USE_PROXY
  },

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true
      });
      console.log('云开发初始化成功');
    } else {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    }
    
    // 初始化本地存储
    this.initStorage();
  },

  initStorage() {
    const cookie = wx.getStorageSync('bilibili_cookie') || '';
    const userInfo = wx.getStorageSync('bilibili_userInfo') || null;
    const signStatus = wx.getStorageSync('sign_status') || { signed: false, lastSignTime: 0, signDays: 0 };

    this.globalData.cookie = cookie;
    this.globalData.userInfo = userInfo;
    this.globalData.signStatus = signStatus;
    this.globalData.isLogin = !!cookie && !!userInfo;
  },

  // 保存Cookie
  saveCookie(cookie) {
    this.globalData.cookie = cookie;
    wx.setStorageSync('bilibili_cookie', cookie);
  },

  // 保存用户信息
  saveUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLogin = true;
    wx.setStorageSync('bilibili_userInfo', userInfo);
  },

  // 登出
  logout() {
    this.globalData.cookie = '';
    this.globalData.userInfo = null;
    this.globalData.isLogin = false;
    wx.removeStorageSync('bilibili_cookie');
    wx.removeStorageSync('bilibili_userInfo');
  },

  // 更新签到状态
  updateSignStatus(status) {
    this.globalData.signStatus = status;
    wx.setStorageSync('sign_status', status);
  }
})
