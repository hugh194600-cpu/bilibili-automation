// pages/index/index.js
const app = getApp();
const bilibili = require('../../utils/bilibili.js');
const { showToast, showLoading, hideLoading, formatDuration, formatTime } = require('../../utils/util.js');

Page({
  data: {
    isLogin: false,
    userInfo: null,
    signStatus: {
      signed: false,
      lastSignTime: 0,
      signDays: 0
    },
    isHanging: false,
    isOnline: false,
    hangupDuration: 0,
    onlineDuration: 0,
    hangupDurationText: '',
    onlineDurationText: '',
    petInfo: null,
    taskLogs: [],
    timer: null
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    this.initData();
    // 启动定时器更新时长
    this.startTimer();
  },

  onHide() {
    this.stopTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  onPullDownRefresh() {
    this.refreshStatus();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 初始化数据
  initData() {
    const isLogin = app.globalData.isLogin;
    const userInfo = app.globalData.userInfo || {};
    const signStatus = app.globalData.signStatus || { signed: false, lastSignTime: 0, signDays: 0 };
    const isHanging = app.globalData.isHanging;
    const hangupStartTime = app.globalData.hangupStartTime;
    const isOnline = app.globalData.isOnline;
    const onlineStartTime = app.globalData.onlineStartTime;

    this.setData({
      isLogin,
      userInfo,
      signStatus,
      isHanging,
      isOnline
    });

    if (isLogin) {
      this.updateDuration();
      this.loadPetInfo();
      this.loadTaskLogs();
    }
  },

  // 启动定时器
  startTimer() {
    if (this.data.timer) return;
    this.data.timer = setInterval(() => {
      this.updateDuration();
    }, 1000);
  },

  // 停止定时器
  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.data.timer = null;
    }
  },

  // 更新时长显示
  updateDuration() {
    const isHanging = app.globalData.isHanging;
    const hangupStartTime = app.globalData.hangupStartTime;
    const isOnline = app.globalData.isOnline;
    const onlineStartTime = app.globalData.onlineStartTime;

    const hangupDuration = isHanging && hangupStartTime ? Math.floor((Date.now() - hangupStartTime) / 1000) : 0;
    const onlineDuration = isOnline && onlineStartTime ? Math.floor((Date.now() - onlineStartTime) / 1000) : 0;

    this.setData({
      isHanging,
      isOnline,
      hangupDuration,
      onlineDuration,
      hangupDurationText: formatDuration(hangupDuration),
      onlineDurationText: formatDuration(onlineDuration)
    });
  },

  // 加载宠物信息
  async loadPetInfo() {
    try {
      const petInfo = await bilibili.getPetInfo();
      if (petInfo) {
        this.setData({ petInfo });
      }
    } catch (error) {
      console.error('加载宠物信息失败:', error);
    }
  },

  // 加载任务日志
  loadTaskLogs() {
    const logs = wx.getStorageSync('task_logs') || [];
    this.setData({ taskLogs: logs.slice(0, 5) });
  },

  // 添加任务日志
  addTaskLog(content) {
    const logs = wx.getStorageSync('task_logs') || [];
    const newLog = {
      time: formatTime(Date.now(), 'HH:mm:ss'),
      content
    };
    logs.unshift(newLog);
    // 只保留最近20条
    const trimmedLogs = logs.slice(0, 20);
    wx.setStorageSync('task_logs', trimmedLogs);
    this.setData({ taskLogs: trimmedLogs.slice(0, 5) });
  },

  // 刷新状态
  async refreshStatus() {
    if (!this.data.isLogin) return;

    showLoading('刷新中...');
    try {
      // 获取签到信息
      const signInfo = await bilibili.getSignInfo();
      if (signInfo) {
        const signStatus = {
          signed: signInfo.status === 2, // 2表示已签到
          lastSignTime: signInfo.last_sign_time * 1000,
          signDays: signInfo.days
        };
        app.updateSignStatus(signStatus);
        this.setData({ signStatus });
      }

      // 获取挂机状态
      const hangupStatus = await bilibili.getHangupStatus();
      if (hangupStatus && hangupStatus.is_hangup) {
        app.globalData.isHanging = true;
        app.globalData.hangupStartTime = hangupStatus.start_time * 1000;
        this.setData({ isHanging: true });
      }

      // 加载宠物信息
      await this.loadPetInfo();

      hideLoading();
      showToast('刷新成功', 'success');
    } catch (error) {
      hideLoading();
      console.error('刷新状态失败:', error);
      showToast('刷新失败', 'none');
    }
  },

  // 快速签到
  async handleQuickSign() {
    if (!this.data.isLogin) {
      this.goToLogin();
      return;
    }

    if (this.data.signStatus.signed) {
      showToast('今日已签到', 'none');
      return;
    }

    showLoading('签到中...');
    try {
      const result = await bilibili.liveSignIn();
      const signStatus = {
        signed: true,
        lastSignTime: Date.now(),
        signDays: (this.data.signStatus.signDays || 0) + 1
      };
      app.updateSignStatus(signStatus);
      this.setData({ signStatus });
      hideLoading();
      showToast('签到成功', 'success');
      this.addTaskLog(`签到成功，获得${result.reward_count || 0}点经验`);
    } catch (error) {
      hideLoading();
      console.error('签到失败:', error);
      showToast(error.message || '签到失败', 'none');
    }
  },

  // 跳转登录
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 跳转签到页
  goToSignin() {
    wx.switchTab({
      url: '/pages/signin/signin'
    });
  },

  // 跳转挂机页
  goToHangup() {
    wx.switchTab({
      url: '/pages/hangup/hangup'
    });
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          this.setData({
            isLogin: false,
            userInfo: null,
            signStatus: { signed: false, lastSignTime: 0, signDays: 0 },
            isHanging: false,
            isOnline: false,
            petInfo: null,
            taskLogs: []
          });
          showToast('已退出登录', 'success');
        }
      }
    });
  }
});
