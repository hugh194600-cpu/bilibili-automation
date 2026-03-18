// pages/login/login.js
const app = getApp();
const bilibili = require('../../utils/bilibili.js');
const { showToast, showLoading, hideLoading, showConfirm } = require('../../utils/util.js');

Page({
  data: {
    cookie: '',
    agreed: false,
    loading: false
  },

  onLoad(options) {
    // 检查是否已登录
    if (app.globalData.isLogin) {
      this.navigateToIndex();
    }
  },

  // 输入Cookie
  onCookieInput(e) {
    this.setData({
      cookie: e.detail.value
    });
  },

  // 用户协议选择
  onAgreementChange(e) {
    this.setData({
      agreed: e.detail.value.includes('agreed')
    });
  },

  // 显示用户协议
  showAgreement() {
    wx.showModal({
      title: '使用协议',
      content: '本工具仅供学习交流使用，请勿用于商业目的。使用本工具产生的任何后果由使用者自行承担。',
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#00A0E9'
    });
  },

  // 处理登录
  async handleLogin() {
    const { cookie, agreed } = this.data;

    if (!cookie) {
      showToast('请输入Cookie', 'none');
      return;
    }

    if (!agreed) {
      showToast('请先同意使用协议', 'none');
      return;
    }

    // 简单验证Cookie格式（只需要SESSDATA或bili_ticket）
    if (!cookie.includes('SESSDATA') && !cookie.includes('bili_ticket')) {
      showToast('Cookie格式不正确，请确保包含SESSDATA或bili_ticket', 'none');
      return;
    }

    this.setData({ loading: true });

    // 直接保存Cookie，不强制验证（因为可能有跨域问题）
    app.saveCookie(cookie);
    
    // 从Cookie中提取用户信息
    const uidMatch = cookie.match(/DedeUserID=([^;]+)/);
    let userInfo = null;
    
    // 尝试获取用户信息
    try {
      showLoading('正在获取用户信息...');
      userInfo = await bilibili.getUserInfo();
      if (userInfo && userInfo.mid) {
        app.saveUserInfo({
          uid: userInfo.mid,
          uname: userInfo.uname,
          face: userInfo.face,
          level: userInfo.level
        });
        app.globalData.uid = userInfo.mid;
      }
    } catch (error) {
      // 获取用户信息失败，从Cookie提取
      console.log('获取用户信息失败，从Cookie提取:', error);
    }
    
    // 如果没有获取到用户信息，从Cookie提取
    if (!userInfo || !userInfo.mid) {
      if (uidMatch) {
        const uid = uidMatch[1];
        // 保存一个基础用户信息
        app.saveUserInfo({
          uid: uid,
          uname: 'B站用户',
          face: '',
          level: 0
        });
        app.globalData.uid = uid;
      } else {
        // 没有UID，至少标记为已登录
        app.globalData.isLogin = true;
      }
    }

    hideLoading();
    showToast('登录成功', 'success');
    
    // 跳转到首页
    setTimeout(() => {
      this.navigateToIndex();
    }, 1500);
  },

  // 跳转到首页
  navigateToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 页面显示时检查登录状态
  onShow() {
    if (app.globalData.isLogin) {
      this.navigateToIndex();
    }
  }
});
