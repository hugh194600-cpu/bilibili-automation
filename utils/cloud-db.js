/**
 * 云数据库操作工具
 * 用于存储用户登录信息、签到记录、挂机记录等
 */

const cloudConfig = require('./cloud-config.js');

/**
 * 初始化云数据库
 */
function getDB() {
  if (!wx.cloud) {
    console.error('云开发未初始化');
    return null;
  }
  return wx.cloud.database();
}

/**
 * 获取用户openid
 */
function getOpenId() {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject(new Error('云开发未初始化'));
      return;
    }
    
    wx.cloud.callFunction({
      name: 'login'
    }).then(res => {
      resolve(res.result.openid);
    }).catch(err => {
      console.error('获取openid失败:', err);
      reject(err);
    });
  });
}

/**
 * 保存用户信息到云数据库
 */
async function saveUserInfo(userInfo) {
  const db = getDB();
  if (!db) return null;
  
  try {
    const openId = await getOpenId();
    
    // 检查是否已存在
    const existing = await db.collection(cloudConfig.COLLECTIONS.USER_INFO)
      .where({ _openid: openId })
      .get();
    
    if (existing.data && existing.data.length > 0) {
      // 更新
      await db.collection(cloudConfig.COLLECTIONS.USER_INFO)
        .doc(existing.data[0]._id)
        .update({
          data: {
            userInfo: userInfo,
            cookie: getApp().globalData.cookie,
            updateTime: db.serverDate()
          }
        });
    } else {
      // 新增
      await db.collection(cloudConfig.COLLECTIONS.USER_INFO).add({
        data: {
          _openid: openId,
          userInfo: userInfo,
          cookie: getApp().globalData.cookie,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
    }
    
    console.log('用户信息已保存到云端');
    return true;
  } catch (error) {
    console.error('保存用户信息失败:', error);
    return false;
  }
}

/**
 * 从云端获取用户信息
 */
async function getUserInfo() {
  const db = getDB();
  if (!db) return null;
  
  try {
    const openId = await getOpenId();
    const result = await db.collection(cloudConfig.COLLECTIONS.USER_INFO)
      .where({ _openid: openId })
      .get();
    
    if (result.data && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 保存签到记录
 */
async function addSignRecord(signData) {
  const db = getDB();
  if (!db) return null;
  
  try {
    const openId = await getOpenId();
    
    await db.collection(cloudConfig.COLLECTIONS.SIGN_RECORDS).add({
      data: {
        _openid: openId,
        signDate: signData.date,
        reward: signData.reward,
        days: signData.days,
        createTime: db.serverDate()
      }
    });
    
    console.log('签到记录已保存到云端');
    return true;
  } catch (error) {
    console.error('保存签到记录失败:', error);
    return false;
  }
}

/**
 * 获取签到记录
 */
async function getSignRecords(limit = 30) {
  const db = getDB();
  if (!db) return [];
  
  try {
    const openId = await getOpenId();
    const result = await db.collection(cloudConfig.COLLECTIONS.SIGN_RECORDS)
      .where({ _openid: openId })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();
    
    return result.data || [];
  } catch (error) {
    console.error('获取签到记录失败:', error);
    return [];
  }
}

/**
 * 保存挂机记录
 */
async function addHangupRecord(record) {
  const db = getDB();
  if (!db) return null;
  
  try {
    const openId = await getOpenId();
    
    await db.collection(cloudConfig.COLLECTIONS.HANGUP_RECORDS).add({
      data: {
        _openid: openId,
        roomId: record.roomId,
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration,
        expGained: record.expGained,
        createTime: db.serverDate()
      }
    });
    
    console.log('挂机记录已保存到云端');
    return true;
  } catch (error) {
    console.error('保存挂机记录失败:', error);
    return false;
  }
}

/**
 * 获取挂机记录
 */
async function getHangupRecords(limit = 30) {
  const db = getDB();
  if (!db) return [];
  
  try {
    const openId = await getOpenId();
    const result = await db.collection(cloudConfig.COLLECTIONS.HANGUP_RECORDS)
      .where({ _openid: openId })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();
    
    return result.data || [];
  } catch (error) {
    console.error('获取挂机记录失败:', error);
    return [];
  }
}

module.exports = {
  getDB,
  getOpenId,
  saveUserInfo,
  getUserInfo,
  addSignRecord,
  getSignRecords,
  addHangupRecord,
  getHangupRecords
};
