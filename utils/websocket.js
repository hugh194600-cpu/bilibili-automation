/**
 * WebSocket管理 - 用于弹幕连接和保活
 */
const app = getApp();

class DanmuWebSocket {
  constructor() {
    this.ws = null;
    this.roomId = 0;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.listeners = {};
    this.protocol = '';
  }

  /**
   * 连接弹幕WebSocket
   * @param {number} roomId 直播间ID
   */
  async connect(roomId) {
    if (this.isConnected) {
      console.log('WebSocket已连接');
      return;
    }

    this.roomId = roomId;
    const { getDanmuConf } = require('./bilibili.js');

    try {
      const conf = await getDanmuConf(roomId);
      if (!conf) {
        throw new Error('获取弹幕配置失败');
      }

      this.protocol = conf.protocol === 'wss' ? 'wss' : 'ws';
      const wsUrl = `${this.protocol}://${conf.host}:${conf.port}/sub`;

      return new Promise((resolve, reject) => {
        this.ws = wx.connectSocket({
          url: wsUrl,
          protocols: ['沫恩很合理'],
          success: () => {
            console.log('WebSocket连接中...');
          },
          fail: (err) => {
            console.error('WebSocket连接失败:', err);
            reject(err);
          }
        });

        wx.onSocketOpen(() => {
          console.log('WebSocket已打开');
          this.isConnected = true;
          this.startHeartbeat();
          this.sendAuth(roomId);
          this.emit('connect', { roomId });
          resolve();
        });

        wx.onSocketMessage((res) => {
          this.handleMessage(res.data);
        });

        wx.onSocketClose(() => {
          console.log('WebSocket已关闭');
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('close', {});
          this.reconnect();
        });

        wx.onSocketError((err) => {
          console.error('WebSocket错误:', err);
          this.isConnected = false;
          this.emit('error', err);
        });
      });
    } catch (error) {
      console.error('连接弹幕服务器失败:', error);
      throw error;
    }
  }

  /**
   * 发送认证消息
   */
  sendAuth(roomId) {
    const authMsg = this.buildAuthPacket(roomId);
    this.send(authMsg);
  }

  /**
   * 构建认证数据包
   */
  buildAuthPacket(roomId) {
    const app = getApp();
    const cookie = app.globalData.cookie || wx.getStorageSync('bilibili_cookie') || '';
    const matches = cookie.match(/bili_jct=([^;]+)/);
    const csrf = matches ? matches[1] : '';

    const data = {
      uid: parseInt(app.globalData.uid) || 0,
      roomid: roomId,
      protover: 2,
      token: '',
      csrf: csrf
    };

    // 构建数据包
    const header = {
      protocol: 1, // 1=json, 2=proto
      operation: 7, // 7=auth
      sequence: 1
    };

    const body = JSON.stringify(data);
    const packet = this.buildPacket(header, body);
    return packet;
  }

  /**
   * 构建WebSocket数据包
   */
  buildPacket(header, body) {
    const headerBytes = JSON.stringify(header);
    const bodyBytes = body;

    // 数据包格式: [16位包长度][16位头部长度][头部][内容]
    const packetLen = 16 + headerBytes.length + bodyBytes.length;
    const headerLen = headerBytes.length;

    const buffer = new ArrayBuffer(16 + headerBytes.length + bodyBytes.length);
    const view = new DataView(buffer);

    // 包长度
    view.setInt32(0, packetLen, true);
    // 头部长度
    view.setInt16(4, headerLen, true);
    // 协议版本
    view.setInt16(6, 1, true);
    // 操作类型
    view.setInt32(8, header.operation, true);
    // 序列号
    view.setInt32(12, header.sequence, true);

    // 写入头部和内容
    const encoder = new TextEncoder();
    const headerArr = encoder.encode(headerBytes);
    const bodyArr = encoder.encode(bodyBytes);

    let offset = 16;
    for (let i = 0; i < headerArr.length; i++) {
      view.setUint8(offset + i, headerArr[i]);
    }
    offset += headerArr.length;
    for (let i = 0; i < bodyArr.length; i++) {
      view.setUint8(offset + i, bodyArr[i]);
    }

    return this.arrayBufferToBase64(buffer);
  }

  /**
   * ArrayBuffer转Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 处理收到的消息
   */
  handleMessage(data) {
    try {
      // 解析消息
      // 这里简化处理，实际需要根据B站协议解析
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);
          this.emit('message', msg);
        } catch (e) {
          // 不是JSON，可能 是二进制
        }
      }
    } catch (error) {
      console.error('处理消息失败:', error);
    }
  }

  /**
   * 发送消息
   */
  send(data) {
    if (this.ws && this.isConnected) {
      wx.sendSocketMessage({
        data,
        fail: (err) => {
          console.error('发送消息失败:', err);
        }
      });
    }
  }

  /**
   * 发送心跳
   */
  sendHeartbeat() {
    // 心跳包是一个空JSON
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);
    view.setInt32(0, 16, true); // 包长度
    view.setInt16(4, 0, true);  // 头部长度
    view.setInt16(6, 1, true);  // 协议版本
    view.setInt32(8, 2, true);  // 操作类型(2=heartbeat)

    const packet = this.arrayBufferToBase64(buffer);
    this.send(packet);
  }

  /**
   * 开始心跳
   */
  startHeartbeat() {
    this.stopHeartbeat();
    // 每30秒发送一次心跳
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 重新连接
   */
  reconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // 5秒后重连
    this.reconnectTimer = setTimeout(() => {
      console.log('正在重新连接...');
      if (this.roomId > 0) {
        this.connect(this.roomId).catch((err) => {
          console.error('重连失败:', err);
        });
      }
    }, 5000);
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      wx.closeSocket();
      this.ws = null;
    }
    this.isConnected = false;
    this.roomId = 0;
  }

  /**
   * 添加事件监听
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    if (callback) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    } else {
      this.listeners[event] = [];
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`事件${event}回调错误:`, error);
      }
    });
  }
}

// 导出单例
let danmuWs = null;

function getDanmuWs() {
  if (!danmuWs) {
    danmuWs = new DanmuWebSocket();
  }
  return danmuWs;
}

module.exports = {
  DanmuWebSocket,
  getDanmuWs
};
