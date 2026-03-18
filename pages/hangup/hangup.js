// pages/hangup/hangup.js
const app = getApp();
const bilibili = require('../../utils/bilibili.js');
const { getDanmuWs } = require('../../utils/websocket.js');
const { showToast, showLoading, hideLoading, formatTime, formatDuration } = require('../../utils/util.js');

Page({
  data: {
    isLogin: false,
    roomId: '',
    isHanging: false,
    loading: false,
    hangupRoomId: '',
    hangupStartTime: 0,
    hangupStartTimeText: '',
    hangupDurationText: '0秒',
    todayDurationText: '0秒',
    danmuCount: 0,
    expGained: 0,
    // 弹幕宠物状态
    petInfo: null,
    petLoading: false,
    // 挂机详情
    hangupDetail: null,
    // CSRF token 状态
    hasCsrf: false,
    // 刷新状态中
    refreshing: false,
    // 直播间信息
    roomInfo: null,
    recommendRooms: [
      { id: '3', name: '3号直播间' },
      { id: '22625061', name: 'B站直播' },
      { id: '23299512', name: '音乐分享' },
      { id: '4809500', name: '游戏直播' }
    ],
    logList: [],
    timer: null,
    danmuTimer: null
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    this.initData();
    this.checkHangupStatus();
    // 页面显示时加载所有信息
    if (this.data.isLogin) {
      this.loadPetInfo();
      this.loadHangupDetail();
      // 如果正在挂机，加载直播间信息
      if (this.data.hangupRoomId) {
        this.loadRoomInfo(this.data.hangupRoomId);
      }
    }
  },

  onHide() {
    // 页面隐藏时不做任何操作，保持挂机状态
  },

  onUnload() {
    this.stopTimer();
    this.stopDanmuTimer();
  },

  initData() {
    const isLogin = app.globalData.isLogin;
    const isHanging = app.globalData.isHanging;
    const hangupRoomId = app.globalData.hangupRoomId || '';
    const hangupStartTime = app.globalData.hangupStartTime || 0;

    this.setData({
      isLogin,
      isHanging,
      hangupRoomId,
      hangupStartTime
    });

    if (isHanging) {
      this.startTimer();
      this.startDanmuTimer();
    }

    this.updateDuration();
    this.loadTodayDuration();
    this.checkCsrfStatus();
  },

  // 检查CSRF状态
  checkCsrfStatus() {
    const cookie = app.globalData.cookie || wx.getStorageSync('bilibili_cookie') || '';
    const hasCsrf = cookie.includes('bili_jct=');
    this.setData({ hasCsrf });
    if (!hasCsrf) {
      this.addLog('警告: Cookie中缺少bili_jct，弹幕发送可能失败');
    }
  },

  // 获取弹幕宠物详情
  async loadPetInfo() {
    if (!this.data.isLogin) return;

    this.setData({ petLoading: true });

    try {
      const petInfo = await bilibili.getPetInfo();
      console.log('宠物API返回数据:', petInfo);
      
      if (petInfo) {
        // 处理可能的API响应格式
        let displayInfo = petInfo;
        if (petInfo.data) {
          displayInfo = petInfo.data; // API返回格式为 { code: 0, data: { ... } }
        }
        
        this.setData({ 
          petInfo: displayInfo, 
          petLoading: false 
        });
        
        // 显示详细的宠物信息
        const petName = displayInfo.name || displayInfo.pet_name || '未知';
        const petLevel = displayInfo.level || displayInfo.lv || 0;
        const petExp = displayInfo.exp || displayInfo.experience || 0;
        const petNextExp = displayInfo.next_exp || displayInfo.next_level_exp || 0;
        
        this.addLog(`宠物信息: ${petName}, 等级: ${petLevel}, 经验: ${petExp}/${petNextExp}`);
      } else {
        this.setData({ petLoading: false });
        this.addLog('未检测到弹幕宠物，请先在B站直播间领取或检查Cookie是否有效');
      }
    } catch (error) {
      console.error('获取宠物信息失败:', error);
      this.setData({ petLoading: false });
      
      // 提供更详细的错误信息
      let errorMsg = '获取宠物信息失败';
      if (error.message) {
        errorMsg += ': ' + error.message;
      } else if (error.errMsg) {
        errorMsg += ': ' + error.errMsg;
      } else if (error.statusCode) {
        errorMsg += ` (HTTP ${error.statusCode})`;
      }
      
      this.addLog(errorMsg);
    }
  },

  // 获取挂机详情
  async loadHangupDetail() {
    if (!this.data.isLogin) return;

    try {
      const hangupDetail = await bilibili.getHangupStatus();
      if (hangupDetail) {
        this.setData({ hangupDetail });
        if (hangupDetail.is_hangup) {
          this.addLog(`挂机详情: 房间${hangupDetail.room_id}, 已挂机${hangupDetail.durations || 0}分钟`);
        } else {
          this.addLog('当前未开启挂机');
        }
      } else {
        this.addLog('获取挂机状态失败');
      }
    } catch (error) {
      console.error('获取挂机详情失败:', error);
      this.addLog('获取挂机状态失败: ' + (error.message || '网络错误'));
    }
  },

  // 获取直播间信息
  async loadRoomInfo(roomId) {
    if (!roomId || !this.data.isLogin) return;

    try {
      const roomInfo = await bilibili.getRoomInfo(roomId);
      if (roomInfo) {
        this.setData({ roomInfo });
        this.addLog(`直播间: ${roomInfo.title || '未知'}, 主播: ${roomInfo.uname || '未知'}`);
      }
    } catch (error) {
      console.error('获取直播间信息失败:', error);
    }
  },

  // 刷新所有状态
  async refreshStatus() {
    if (!this.data.isLogin || this.data.refreshing) return;

    this.setData({ refreshing: true });
    this.addLog('正在刷新状态...');

    try {
      // 并行获取宠物信息和挂机详情
      await Promise.all([
        this.loadPetInfo(),
        this.loadHangupDetail()
      ]);

      // 检查挂机状态
      await this.checkHangupStatus();

      this.addLog('状态刷新完成');
    } catch (error) {
      console.error('刷新状态失败:', error);
      this.addLog('刷新状态失败');
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // 检查挂机状态
  async checkHangupStatus() {
    if (!this.data.isLogin) return;

    try {
      const hangupStatus = await bilibili.getHangupStatus();
      if (hangupStatus && hangupStatus.is_hangup) {
        app.globalData.isHanging = true;
        app.globalData.hangupRoomId = hangupStatus.room_id;
        app.globalData.hangupStartTime = hangupStatus.start_time * 1000;

        this.setData({
          isHanging: true,
          hangupRoomId: hangupStatus.room_id,
          hangupStartTime: hangupStatus.start_time * 1000
        });

        this.startTimer();
        this.startDanmuTimer();
        this.addLog('检测到挂机状态，继续挂机中...');
      }
    } catch (error) {
      console.error('检查挂机状态失败:', error);
    }
  },

  // 输入直播间ID
  onRoomIdInput(e) {
    this.setData({
      roomId: e.detail.value
    });
  },

  // 选择推荐直播间
  selectRoom(e) {
    const roomId = e.currentTarget.dataset.id;
    this.setData({ roomId });
  },

  // 开始/停止挂机
  async toggleHangup() {
    if (!this.data.isLogin) {
      this.goToLogin();
      return;
    }

    if (this.data.loading) return;

    if (this.data.isHanging) {
      await this.stopHangup();
    } else {
      await this.startHangup();
    }
  },

  // 开始挂机
  async startHangup() {
    const { roomId } = this.data;

    if (!roomId) {
      showToast('请输入直播间ID', 'none');
      return;
    }

    this.setData({ loading: true });
    showLoading('正在开始挂机...');

    // 验证直播间ID格式
    if (!/^\d+$/.test(roomId)) {
      hideLoading();
      showToast('直播间ID必须是数字', 'none');
      return;
    }

    try {
      // 验证直播间是否存在（可能因跨域失败）
      let roomInfo;
      try {
        roomInfo = await bilibili.getRoomInfo(roomId);
      } catch (apiError) {
        console.log('获取直播间信息失败，跳过验证');
      }

      // 尝试开始弹幕宠物挂机
      try {
        await bilibili.startPetHangup(roomId);
        this.addLog(`弹幕宠物挂机开始成功，直播间: ${roomId}`);
      } catch (petError) {
        // 弹幕宠物挂机失败，使用模拟模式
        console.log('弹幕宠物挂机失败，使用模拟弹幕方式');
        this.addLog('开始模拟挂机模式（本地计时）');
      }

      // 更新状态
      const now = Date.now();
      app.globalData.isHanging = true;
      app.globalData.hangupRoomId = roomId;
      app.globalData.hangupStartTime = now;

      this.setData({
        isHanging: true,
        hangupRoomId: roomId,
        hangupStartTime: now,
        hangupStartTimeText: formatTime(now, 'HH:mm:ss'),
        roomId: ''
      });

      hideLoading();
      showToast('挂机已开始', 'success');

      // 启动定时器
      this.startTimer();
      this.startDanmuTimer();

      // 加载宠物和挂机详情
      this.loadPetInfo();
      this.loadHangupDetail();

    } catch (error) {
      hideLoading();
      console.error('开始挂机失败:', error);
      // 即使API失败，也允许本地挂机
      const now = Date.now();
      app.globalData.isHanging = true;
      app.globalData.hangupRoomId = roomId;
      app.globalData.hangupStartTime = now;

      this.setData({
        isHanging: true,
        hangupRoomId: roomId,
        hangupStartTime: now,
        hangupStartTimeText: formatTime(now, 'HH:mm:ss'),
        roomId: ''
      });
      
      showToast('挂机已开始（本地模式）', 'success');
      this.startTimer();
      this.addLog('本地挂机模式已启动');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 停止挂机
  async stopHangup() {
    this.setData({ loading: true });

    try {
      // 尝试停止弹幕宠物挂机
      try {
        await bilibili.stopPetHangup();
        this.addLog('弹幕宠物挂机已停止');
      } catch (petError) {
        console.log('停止弹幕宠物挂机失败', petError);
      }

      // 更新状态
      app.globalData.isHanging = false;
      app.globalData.hangupRoomId = '';

      this.setData({
        isHanging: false,
        hangupRoomId: '',
        danmuCount: 0,
        expGained: 0
      });

      // 保存今日累计时长
      this.saveTodayDuration();

      showToast('挂机已停止', 'success');
      this.addLog('挂机已停止');

    } catch (error) {
      console.error('停止挂机失败:', error);
      showToast(error.message || '停止挂机失败', 'none');
    } finally {
      this.setData({ loading: false });
      this.stopTimer();
      this.stopDanmuTimer();
    }
  },

  // 启动计时器
  startTimer() {
    if (this.data.timer) return;
    this.data.timer = setInterval(() => {
      this.updateDuration();
    }, 1000);
  },

  // 停止计时器
  stopTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.data.timer = null;
    }
  },

  // 更新时长显示
  updateDuration() {
    const { hangupStartTime, isHanging } = this.data;
    if (!isHanging || !hangupStartTime) return;

    const duration = Math.floor((Date.now() - hangupStartTime) / 1000);
    this.setData({
      hangupDurationText: formatDuration(duration)
    });
  },

  // 加载今日累计时长
  loadTodayDuration() {
    const today = new Date().toDateString();
    const saved = wx.getStorageSync('hangup_today') || {};
    const savedDate = saved.date;

    if (savedDate === today) {
      this.setData({
        todayDurationText: formatDuration(saved.duration || 0)
      });
    }
  },

  // 保存今日累计时长
  saveTodayDuration() {
    const { hangupStartTime } = this.data;
    if (!hangupStartTime) return;

    const today = new Date().toDateString();
    const saved = wx.getStorageSync('hangup_today') || {};
    const savedDate = saved.date;

    let duration = 0;
    if (savedDate === today) {
      duration = (saved.duration || 0) + Math.floor((Date.now() - hangupStartTime) / 1000);
    } else {
      duration = Math.floor((Date.now() - hangupStartTime) / 1000);
    }

    wx.setStorageSync('hangup_today', {
      date: today,
      duration: duration
    });

    this.setData({
      todayDurationText: formatDuration(duration)
    });
  },

  // 启动弹幕发送定时器
  startDanmuTimer() {
    if (this.data.danmuTimer) return;

    // 每30秒发送一条弹幕
    this.data.danmuTimer = setInterval(() => {
      this.sendDanmu();
    }, 30000);
  },

  // 停止弹幕发送定时器
  stopDanmuTimer() {
    if (this.data.danmuTimer) {
      clearInterval(this.data.danmuTimer);
      this.data.danmuTimer = null;
    }
  },

  // 发送弹幕
  async sendDanmu() {
    const { isHanging, hangupRoomId, danmuCount, expGained, hasCsrf } = this.data;
    if (!isHanging || !hangupRoomId) return;

    // 检查CSRF
    if (!hasCsrf) {
      this.addLog('警告: 缺少CSRF，尝试本地模拟');
      // 即使没有CSRF也模拟增加经验（本地挂机模式）
      const newDanmuCount = danmuCount + 1;
      const newExpGained = expGained + Math.floor(Math.random() * 3) + 1;
      this.setData({
        danmuCount: newDanmuCount,
        expGained: newExpGained
      });
      this.addLog(`本地模拟: 弹幕+1, 经验+${newExpGained - expGained}`);
      return;
    }

    // 弹幕内容列表
    const danmuList = [
      '我来啦~',
      '打卡签到',
      '支持主播',
      '666',
      '加油',
      '真棒',
      '学习了',
      '不错哦'
    ];
    const randomDanmu = danmuList[Math.floor(Math.random() * danmuList.length)];

    try {
      const success = await bilibili.sendDanmu(hangupRoomId, randomDanmu);
      if (success) {
        const newDanmuCount = danmuCount + 1;
        const newExpGained = expGained + Math.floor(Math.random() * 5) + 1;
        this.setData({
          danmuCount: newDanmuCount,
          expGained: newExpGained
        });
        this.addLog(`发送弹幕: ${randomDanmu} (+${newExpGained - expGained}经验)`);
      } else {
        this.addLog('弹幕发送失败，可能是被禁言了');
      }
    } catch (error) {
      console.error('发送弹幕失败:', error);
      this.addLog('弹幕发送异常，尝试本地模拟');
      // API失败时使用本地模拟
      const newDanmuCount = danmuCount + 1;
      const newExpGained = expGained + Math.floor(Math.random() * 3) + 1;
      this.setData({
        danmuCount: newDanmuCount,
        expGained: newExpGained
      });
      this.addLog(`本地模拟: 弹幕+1, 经验+${newExpGained - expGained}`);
    }
  },

  // 添加日志
  addLog(content) {
    const logList = [...this.data.logList];
    const newLog = {
      time: formatTime(Date.now(), 'HH:mm:ss'),
      content
    };
    logList.unshift(newLog);

    // 只保留最近50条
    this.setData({
      logList: logList.slice(0, 50)
    });
  },

  // 跳转登录
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  }
});
