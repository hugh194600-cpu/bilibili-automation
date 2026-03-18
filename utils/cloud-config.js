/**
 * 云开发配置
 * 
 * 使用方法:
 * 1. 在微信开发者工具中开通云开发
 * 2. 创建云开发环境，获取环境ID
 * 3. 将环境ID填入下方 CLOUD_ENV
 * 4. 在云数据库中创建以下集合:
 *    - user_info: 用户信息
 *    - sign_records: 签到记录
 *    - hangup_records: 挂机记录
 */

module.exports = {
  // 云开发环境ID（从微信开发者工具获取）
  CLOUD_ENV: 'your-cloud-env-id',
  
  // 后端API服务器地址（部署后填入）
  // 可以部署到: Vercel, Railway, Render, 腾讯云等
  API_BASE_URL: 'https://your-server.example.com',
  
  // 是否使用后端API（设为true启用）
  USE_PROXY: true,
  
  // 集合名称
  COLLECTIONS: {
    USER_INFO: 'user_info',
    SIGN_RECORDS: 'sign_records',
    HANGUP_RECORDS: 'hangup_records'
  }
};
