# B站弹幕宠物小程序 - 部署指南

本指南将帮助你完成项目的完整部署，解决微信小程序跨域调用B站API的问题。

## 目录
1. [部署后端API服务器](#1-部署后端api服务器)
2. [开通小程序云开发](#2-开通小程序云开发)
3. [配置小程序](#3-配置小程序)
4. [上传部署云函数](#4-上传部署云函数)
5. [测试与使用](#5-测试与使用)

---

## 1. 部署后端API服务器

### 方案一: Vercel（推荐，免费且快速）

1. 创建GitHub仓库，上传 `server` 目录内容
2. 访问 [Vercel.com](https://vercel.com) 并使用GitHub登录
3. 点击 "New Project" 导入你的仓库
4. 配置:
   - Framework Preset: Other
   - Build Command: (留空)
   - Output Directory: (留空)
5. 点击 "Deploy"
6. 部署完成后会得到一个URL，如: `https://your-project.vercel.app`

### 方案二: Railway（提供免费额度）

1. 访问 [Railway.app](https://railway.app) 并登录
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择仓库
4. 部署完成后获取URL

### 方案三: 腾讯云服务器

1. 购买腾讯云服务器
2. 安装Node.js和PM2:
   ```bash
   npm install -g pm2
   ```
3. 上传server目录到服务器
4. 运行:
   ```bash
   cd server
   npm install
   pm2 start server.js
   ```
5. 配置Nginx反向代理（可选）

---

## 2. 开通小程序云开发

1. 打开 **微信开发者工具**
2. 点击右上角 "云开发" 按钮
3. 点击 "开通"
4. 创建环境（选择按量付费或包年包月）
5. 获取环境ID（如: `your-env-123456`）

### 创建数据库集合

在云开发控制台 → 数据库中创建以下集合:

| 集合名称 | 用途 |
|---------|------|
| `user_info` | 存储用户登录信息 |
| `sign_records` | 存储签到记录 |
| `hangup_records` | 存储挂机记录 |

---

## 3. 配置小程序

### 3.1 修改 cloud-config.js

打开 `utils/cloud-config.js`，填入你的配置:

```javascript
module.exports = {
  // 你的云开发环境ID
  CLOUD_ENV: 'your-env-123456',
  
  // 后端API服务器地址（部署后填入）
  API_BASE_URL: 'https://your-project.vercel.app',
  
  // 启用代理
  USE_PROXY: true,
  
  // 集合名称（保持不变）
  COLLECTIONS: {
    USER_INFO: 'user_info',
    SIGN_RECORDS: 'sign_records',
    HANGUP_RECORDS: 'hangup_records'
  }
};
```

### 3.2 配置合法域名

在微信小程序后台 → 开发管理 → 开发设置 → 服务器域名中:

- 勾选"已有合法域名"
- 在 `request合法域名` 中添加你的后端API地址，如:
  ```
  https://your-project.vercel.app
  ```

---

## 4. 上传部署云函数

### 4.1 创建云函数目录

确保项目根目录有 `cloudfunctions` 文件夹（已在项目中创建）

### 4.2 在开发者工具中上传

1. 右键点击 `cloudfunctions/login` 文件夹
2. 选择 "上传并部署: 云端安装依赖"
3. 选择环境并上传

---

## 5. 测试与使用

### 5.1 测试后端API

访问以下URL验证部署成功:
```
https://your-project.vercel.app/health
```
应返回: `{ "status": "ok", "timestamp": ... }`

### 5.2 测试小程序

1. 在微信开发者工具中运行项目
2. 登录页面粘贴B站Cookie
3. 尝试签到和挂机功能

---

## 常见问题

### Q: 签到还是失败怎么办？
A: 检查以下几点:
1. 后端API是否正常响应 `/health`
2. Cookie是否包含 `SESSDATA` 和 `bili_jct`
3. 微信开发者工具是否显示"域名不合法"错误

### Q: 云开发初始化失败？
A: 
1. 确保微信开发者工具版本是最新
2. 检查基础库版本（需要2.2.3以上）
3. 确认环境ID正确

### Q: 如何更新后端API？
A: 
- 修改 `server/server.js` 后重新部署到Vercel即可

---

## 文件结构

```
项目目录/
├── server/                 # 后端服务器
│   ├── package.json
│   └── server.js          # API代理服务
├── cloudfunctions/        # 云函数
│   └── login/
│       ├── index.js
│       └── config.json
├── utils/
│   ├── bilibili.js       # B站API（已修改支持代理）
│   ├── cloud-config.js   # 云开发配置
│   └── cloud-db.js       # 云数据库操作
├── pages/                 # 小程序页面
├── app.js                # 应用入口（已修改）
└── README_DEPLOY.md      # 本文件
```

---

## 技术支持

如有问题，请检查:
1. 控制台错误日志
2. 后端API日志（Vercel后台可查看）
3. 云开发日志（云开发控制台 → 日志管理）
