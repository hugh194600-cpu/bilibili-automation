# B站弹幕宠物助手 - 微信小程序

一个专为B站用户打造的弹幕宠物签到、挂机修炼小程序，支持B站账号登录、自动签到、直播间挂机等功能。

## 🌟 功能特色

### 🎯 核心功能
- **B站账号登录** - 支持Cookie方式登录，安全便捷
- **每日自动签到** - 一键完成直播签到，获取经验奖励
- **直播间挂机修炼** - 在指定直播间自动挂机，提升弹幕宠物等级
- **弹幕宠物管理** - 查看宠物信息、等级、经验值
- **实时状态监控** - 显示挂机时长、弹幕发送数量、获得经验

### 📊 数据管理
- **签到记录** - 查看历史签到记录和奖励
- **挂机统计** - 统计今日和累计挂机时长
- **任务日志** - 实时显示任务执行状态和日志

### 🔧 智能特性
- **自动重连** - 网络异常自动重连，保证挂机不中断
- **本地缓存** - 本地存储登录信息和任务数据
- **多端支持** - 支持微信开发者工具、真机调试

## 📱 页面介绍

### 首页 (index)
- 用户状态总览
- 签到/挂机/在线状态卡片
- 快捷操作入口
- 最近任务日志

### 签到页 (signin)
- 日历式签到展示
- 连续签到天数统计
- 签到奖励说明
- 签到历史记录

### 挂机页 (hangup)
- 直播间ID输入/选择
- 弹幕宠物状态显示
- 实时挂机信息监控
- 自动弹幕发送功能
- 实时日志输出

### 我的页 (mine)
- 用户信息显示
- 数据统计（签到/挂机）
- 清除缓存
- 使用帮助和关于

## 🚀 快速开始

### 前置要求
- 微信开发者工具（最新版）
- 微信小程序账号
- Node.js 14+ (用于部署后端)
- B站账号（需要Cookie）

### 1. 克隆项目
```bash
git clone <repository-url>
cd bilibili-danmu-pet-miniapp
```

### 2. 配置小程序

#### 配置云开发
1. 打开微信开发者工具
2. 点击右上角的"云开发"按钮
3. 创建云开发环境（免费额度足够）
4. 记录环境ID（如: `cloud1-xxx`）

#### 修改配置文件
打开 `utils/cloud-config.js`，填入你的配置：

```javascript
module.exports = {
  // 你的云开发环境ID
  CLOUD_ENV: 'your-cloud-env-id',
  
  // 后端API服务器地址（部署后填入）
  API_BASE_URL: 'https://your-server.example.com',
  
  // 是否使用后端API
  USE_PROXY: true,
  
  // 集合名称
  COLLECTIONS: {
    USER_INFO: 'user_info',
    SIGN_RECORDS: 'sign_records',
    HANGUP_RECORDS: 'hangup_records'
  }
};
```

### 3. 部署后端API（解决跨域）

#### 方案一：Vercel（推荐，免费）

1. 安装Vercel CLI：
```bash
npm install -g vercel
```

2. 进入server目录：
```bash
cd server
```

3. 部署到Vercel：
```bash
vercel --prod
```

4. 部署完成后，会得到一个URL（如 `https://your-project.vercel.app`）

5. 将URL填入 `utils/cloud-config.js` 的 `API_BASE_URL`

#### 方案二：本地测试

```bash
cd server
npm install
npm run dev
```

服务器将在 `http://localhost:3000` 启动

### 4. 配置合法域名

在微信小程序后台 → 开发管理 → 开发设置 → 服务器域名中：

**request合法域名** 添加：
- `https://your-server.vercel.app` (你的后端地址)
- `https://api.bilibili.com` (B站API，可选)
- `https://api.live.bilibili.com` (B站直播API，可选)

### 5. 上传云函数

1. 在微信开发者工具中
2. 右键点击 `cloudfunctions/login` 文件夹
3. 选择"上传并部署：云端安装依赖"
4. 选择你的云开发环境

### 6. 创建数据库集合

在云开发控制台 → 数据库中创建以下集合：

| 集合名称 | 用途 |
|---------|------|
| `user_info` | 存储用户登录信息 |
| `sign_records` | 存储签到记录 |
| `hangup_records` | 存储挂机记录 |

### 7. 编译运行

在微信开发者工具中：
- 点击"编译"
- 扫描二维码在真机上预览
- 开始使用！

## 📖 使用指南

### 如何获取B站Cookie

#### 电脑端（推荐）
1. 打开浏览器，访问 `bilibili.com` 并登录
2. 按 `F12` 打开开发者工具
3. 切换到 "Network"（网络）标签
4. 刷新页面，点击任意请求
5. 在右侧找到 "Request Headers" → "Cookie"
6. 复制完整的Cookie字符串

#### 手机端
1. 用手机浏览器打开B站网页版
2. 登录后，点击右下角"我的"
3. 查看网页源代码获取Cookie

**重要提示**：Cookie包含你的登录凭证，请勿泄露给他人！

### 开始挂机

1. 登录成功后，进入"挂机"页面
2. 输入要挂机的直播间ID（数字）
3. 点击"开始挂机"
4. 系统会自动发送弹幕获取经验
5. 可以在日志区域查看实时状态

### 每日签到

1. 进入"签到"页面
2. 点击"立即签到"按钮
3. 查看签到奖励和连续签到天数

## 🛠️ 技术架构

### 前端
- **框架**：微信小程序原生开发
- **UI组件**：原生组件 + 自定义样式
- **状态管理**：App全局数据 + 本地存储
- **网络请求**：wx.request + Promise封装

### 后端（API代理）
- **框架**：Express.js
- **部署**：Vercel / Railway / 云服务器
- **功能**：解决微信小程序跨域问题，代理B站API请求

### 云开发
- **环境**：微信云开发
- **数据库**：云数据库（用户、签到、挂机记录）
- **云函数**：用户登录处理

## 📁 项目结构

```
bilibili-danmu-pet-miniapp/
├── pages/                    # 页面目录
│   ├── index/               # 首页
│   ├── login/               # 登录页
│   ├── signin/              # 签到页
│   ├── hangup/              # 挂机页
│   └── mine/                # 我的页
├── components/              # 组件目录
├── utils/                   # 工具函数
│   ├── api.js              # API请求封装
│   ├── bilibili.js         # B站相关API
│   ├── websocket.js        # WebSocket管理
│   ├── util.js             # 通用工具
│   └── cloud-config.js     # 云开发配置
├── server/                  # 后端服务器
│   ├── package.json
│   ├── server.js           # Express API代理
│   └── vercel.json         # Vercel配置
├── cloudfunctions/          # 云函数
│   └── login/              # 登录云函数
│       ├── index.js
│       └── config.json
├── assets/                  # 静态资源
├── app.js                   # 应用入口
├── app.json                 # 全局配置
├── app.wxss                 # 全局样式
├── project.config.json      # 项目配置
├── sitemap.json            # 站点地图
├── README.md               # 项目说明
├── README_DEPLOY.md        # 部署指南
└── SPEC.md                 # 规格说明书
```

## 🔧 API接口

### B站相关API（通过代理）

#### 用户相关
- `GET /api/user/info` - 获取用户信息
- `GET /api/user/check` - 验证Cookie有效性

#### 签到相关
- `POST /api/sign/signin` - 直播签到
- `GET /api/sign/info` - 获取签到状态

#### 弹幕宠物相关
- `GET /api/pet/info` - 获取宠物信息
- `POST /api/pet/signin` - 宠物签到
- `POST /api/pet/hangup/start` - 开始挂机
- `POST /api/pet/hangup/stop` - 停止挂机
- `GET /api/pet/hangup/status` - 获取挂机状态

#### 直播间相关
- `GET /api/room/info` - 获取直播间信息
- `POST /api/danmu/send` - 发送弹幕
- `GET /api/danmu/conf` - 获取弹幕配置

## 📝 注意事项

### ⚠️ 重要提醒
1. **Cookie安全**：Cookie是重要凭证，请勿泄露给他人
2. **合法使用**：本工具仅供学习交流，请勿用于商业目的
3. **风险自负**：使用本工具产生的任何后果由使用者自行承担
4. **遵守规则**：请遵守B站相关规定，合理使用自动化工具

### 🔍 常见问题

**Q: 签到失败怎么办？**
A: 
- 检查后端API是否正常（访问 `/health`）
- 确认Cookie是否包含 `SESSDATA` 和 `bili_jct`
- 检查微信小程序合法域名配置

**Q: 云开发初始化失败？**
A:
- 确保微信开发者工具版本为最新
- 检查基础库版本（需要2.2.3以上）
- 确认环境ID配置正确

**Q: 挂机没有获得经验？**
A:
- 确认直播间ID正确且直播间正在直播
- 检查Cookie是否有效
- 查看日志是否有错误提示
- 可能是B站API限制，尝试重新登录

**Q: 如何更新后端API？**
A:
- 修改 `server/server.js`
- 重新部署到Vercel（会自动更新）

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 MIT 协议开源，详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Bilibili](https://www.bilibili.com/) - 提供弹幕宠物功能
- [微信小程序](https://developers.weixin.qq.com/miniprogram/) - 提供开发平台
- [Vercel](https://vercel.com/) - 提供免费的部署服务

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/your-repo/issues)
- 发送邮件: your-email@example.com

---

**免责声明**：本项目仅供学习交流使用，请勿用于商业目的。使用本工具产生的任何后果由使用者自行承担。B站弹幕宠物是B站的官方功能，本工具仅提供自动化辅助功能。

## ⭐ Star 支持

如果觉得这个项目对你有帮助，请给个 Star ⭐ 支持一下！
