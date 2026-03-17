# B站自动化任务 - 技术学习项目

> ⚠️ **重要警告**：本项目仅供学习自动化技术原理，请勿用于违规操作。使用自动化脚本可能违反B站《用户使用协议》，导致账号被封禁。

## 📚 学习内容

通过本项目你可以学习到：

1. **Python 面向对象编程** - 如何结构化设计自动化脚本
2. **HTTP 请求模拟** - 如何构造请求头、Cookie管理
3. **任务调度** - 定时任务的实现方式
4. **云端部署** - GitHub Actions 免费定时运行
5. **环境变量管理** - 敏感信息的安全处理

## 🏗️ 项目结构

```
.
├── bilibili_automation.py    # 核心自动化脚本
├── README.md                  # 本说明文档
├── .github/
│   └── workflows/
│       └── bilibili-automation.yml  # GitHub Actions配置
└── requirements.txt           # Python依赖
```

## 🚀 快速开始

### 方式一：本地运行

```bash
# 1. 安装依赖
pip install requests python-dotenv

# 2. 设置Cookie（可选，用于测试登录功能）
# Windows:
set BILIBILI_COOKIE=your_cookie_here

# 3. 运行脚本
python bilibili_automation.py
```

### 方式二：GitHub Actions 自动运行（推荐）

> 电脑关机也能运行！完全免费！

1. **Fork 本仓库**

2. **获取 B站 Cookie**
   - 登录 B站网页版
   - 按 F12 打开开发者工具
   - Application → Cookies → 复制 SESSDATA 值

3. **添加密钥**
   - 进入仓库 → Settings → Secrets and variables → Actions
   - 新建 Secret：`BILIBILI_COOKIE`
   - 值：粘贴你的 Cookie

4. **启用 Actions**
   - 进入 Actions 页面
   - 点击 "I understand my workflows, go ahead and enable them"

5. **手动触发测试**
   - 进入 Actions → Bilibili Automation → Run workflow

## ⏰ 定时运行时间

当前配置：每天 **北京时间 09:00** 自动执行

修改时间，编辑 `.github/workflows/bilibili-automation.yml`：

```yaml
schedule:
  - cron: '0 1 * * *'  # UTC时间
```

换算参考：
| UTC | 北京时间 |
|-----|----------|
| 0 1 * * * | 09:00 |
| 0 2 * * * | 10:00 |
| 0 9 * * * | 17:00 |

## 🔧 技术要点

### 1. Cookie 管理
```python
# 从环境变量读取，更安全
cookie = os.getenv("BILIBILI_COOKIE")

# 构建请求头
headers = {
    "User-Agent": "...",
    "Cookie": cookie,
    "Referer": "https://www.bilibili.com"
}
```

### 2. 任务调度方式对比

| 方式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| cron (Linux) | 稳定可靠 | 需要服务器 | 运维自动化 |
| GitHub Actions | 免费 | 最长6小时/次 | 学习/小任务 |
| Windows计划任务 | 开机即用 | 需开着电脑 | 本地日常 |
| 云函数 | 按量付费 | 有免费额度 | 生产环境 |

### 3. 日志记录
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("任务开始执行")
```

## ⚠️ 风险提示

1. **账号风险**：B站禁止自动化脚本，可能导致封号
2. **Cookie 泄露**：不要将 Cookie 提交到公开仓库
3. **频率限制**：请求过于频繁会触发风控
4. **法律风险**：滥用可能涉及违法

## 📖 扩展学习

- [Requests 库官方文档](https://docs.python-requests.org/)
- [GitHub Actions 教程](https://docs.github.com/en/actions)
- [B站开放平台API](https://open.bilibili.com/)

## 📄 许可证

仅供学习交流，请勿用于商业目的。
