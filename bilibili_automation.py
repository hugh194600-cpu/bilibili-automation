# -*- coding: utf-8 -*-
"""
B站自动化任务脚本 - 技术学习示例
⚠️ 警告：本代码仅供学习自动化技术原理，请遵守B站《用户使用协议》
"""

import json
import os
import time
import random
import requests
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, field

# ==================== 数据结构 ====================

@dataclass
class BilibiliTask:
    """B站任务基类"""
    name: str  # 任务名称
    description: str = ""  # 任务描述
    completed: bool = False  # 是否完成
    reward: int = 0  # 奖励数量

@dataclass
class UserInfo:
    """用户信息（模拟）"""
    uid: int = 0
    nickname: str = ""
    level: int = 0
    vip_type: int = 0
    coins: float = 0.0  # 硬币余额
    experience: int = 0  # 经验值

@dataclass
class EggPetInfo:
    """蛋宠信息"""
    pet_id: str = ""
    pet_name: str = ""
    level: int = 1
    exp: int = 0
    hunger: int = 100  # 饱食度
    mood: int = 100   # 心情值
    last_sign_time: str = ""  # 上次签到时间
    last_practice_time: str = ""  # 上次修炼时间


# ==================== 核心类 ====================

class BilibiliAutomation:
    """
    B站自动化框架示例
    
    这个类演示了：
    1. 如何结构化组织自动化任务
    2. 如何模拟Cookie/Session管理
    3. 如何实现任务调度逻辑
    4. 如何记录日志和状态
    """
    
    # API端点
    API_BASE = "https://api.bilibili.com"
    
    def __init__(self, cookie: Optional[str] = None):
        """
        初始化
        
        Args:
            cookie: 登录后的Cookie字符串（格式：key1=value1; key2=value2）
        """
        self.cookie = cookie or os.getenv("BILIBILI_COOKIE", "")
        self.session_id: Optional[str] = None
        self.user_info: Optional[UserInfo] = None
        self.egg_pet_info: Optional[EggPetInfo] = None
        self.tasks: list[BilibiliTask] = []
        self.logger = []
        self._session = requests.Session()
        
    def _log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"
        self.logger.append(log_entry)
        print(log_entry)
    
    def _make_headers(self) -> Dict[str, str]:
        """构建请求头"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.bilibili.com",
            "Accept": "application/json, text/plain, */*",
        }
        if self.cookie:
            headers["Cookie"] = self.cookie
        return headers
    
    def _parse_cookie(self) -> Dict[str, str]:
        """解析Cookie为字典"""
        cookie_dict = {}
        if not self.cookie:
            return cookie_dict
        for item in self.cookie.split(";"):
            if "=" in item:
                key, value = item.strip().split("=", 1)
                cookie_dict[key] = value
        return cookie_dict
    
    def _api_request(self, url: str, method: str = "GET", data: dict = None) -> Optional[Dict]:
        """
        发送API请求
        
        Args:
            url: API地址
            method: 请求方法
            data: 请求数据
            
        Returns:
            响应数据
        """
        try:
            headers = self._make_headers()
            if method == "GET":
                response = self._session.get(url, headers=headers, timeout=10)
            else:
                response = self._session.post(url, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                return result
            else:
                self._log(f"API请求失败: {response.status_code}", "ERROR")
                return None
        except Exception as e:
            self._log(f"API请求异常: {e}", "ERROR")
            return None
    
    def login(self, cookie: str) -> bool:
        """
        验证登录（通过Cookie）
        
        Args:
            cookie: Cookie字符串
            
        Returns:
            是否登录成功
        """
        self._log("验证登录状态...")
        
        # 解析Cookie
        cookie_dict = {}
        for item in cookie.split(";"):
            if "=" in item:
                key, value = item.strip().split("=", 1)
                cookie_dict[key] = value
        
        # 检查必要的Cookie字段
        required_fields = ["SESSDATA", "bili_jct", "DedeUserID"]
        missing = [f for f in required_fields if f not in cookie_dict]
        
        if missing:
            self._log(f"Cookie缺少必要字段: {missing}", "WARNING")
            return False
        
        self.cookie = cookie
        
        # 尝试获取用户信息验证Cookie有效性
        result = self._api_request(f"{self.API_BASE}/x/web-interface/nav")
        if result and result.get("code") == 0:
            self._log("登录验证成功 ✓")
            return True
        else:
            self._log("Cookie可能已失效", "WARNING")
            return False
    
    def fetch_user_info(self) -> UserInfo:
        """获取用户信息"""
        self._log("获取用户信息...")
        
        result = self._api_request(f"{self.API_BASE}/x/web-interface/nav")
        
        if result and result.get("code") == 0:
            data = result.get("data", {})
            user = UserInfo(
                uid=data.get("mid", 0),
                nickname=data.get("uname", ""),
                level=data.get("level", 0),
                vip_type=data.get("vipType", 0),
                coins=float(data.get("money", 0)),
                experience=data.get("experience", 0)
            )
            self.user_info = user
            self._log(f"用户: {user.nickname}, 等级: L{user.level}")
            return user
        else:
            # 模拟数据
            mock_user = UserInfo(
                uid=21509032,
                nickname="B站用户",
                level=6,
                vip_type=1,
                coins=168.5,
                experience=12580
            )
            self.user_info = mock_user
            self._log(f"用户: {mock_user.nickname}, 等级: L{mock_user.level} (模拟)")
            return mock_user
    
    # ==================== 蛋宠相关功能 ====================
    
    def get_egg_pet_info(self) -> Optional[EggPetInfo]:
        """
        获取蛋宠信息
        
        实际API: https://api.bilibili.com/x/vas/pet/info
        """
        self._log("获取蛋宠信息...")
        
        # 尝试调用真实API
        try:
            result = self._api_request(f"{self.API_BASE}/x/vas/pet/info")
            
            if result and result.get("code") == 0:
                data = result.get("data", {})
                pet = EggPetInfo(
                    pet_id=data.get("id", ""),
                    pet_name=data.get("name", "蛋宠"),
                    level=data.get("level", 1),
                    exp=data.get("exp", 0),
                    hunger=data.get("hunger", 100),
                    mood=data.get("mood", 100),
                    last_sign_time=data.get("last_sign_time", ""),
                    last_practice_time=data.get("last_practice_time", "")
                )
                self.egg_pet_info = pet
                self._log(f"蛋宠: {pet.pet_name}, 等级: L{pet.level}, 饱食度: {pet.hunger}%, 心情: {pet.mood}%")
                return pet
            else:
                self._log(f"获取蛋宠信息失败: {result.get('message', '未知错误')}", "WARNING")
        except Exception as e:
            self._log(f"API请求异常: {e}", "WARNING")
        
        # API失败时使用模拟数据
        pet = EggPetInfo(
            pet_id="pet_12345",
            pet_name="小胖啵",
            level=5,
            exp=1234,
            hunger=80,
            mood=90,
            last_sign_time="",
            last_practice_time=""
        )
        
        self.egg_pet_info = pet
        self._log(f"蛋宠: {pet.pet_name}, 等级: L{pet.level}, 饱食度: {pet.hunger}%, 心情: {pet.mood}% (模拟)")
        return pet
    
    def egg_pet_sign(self) -> bool:
        """
        蛋宠签到
        
        实际API: https://api.bilibili.com/x/vas/pet/sign
        """
        self._log("执行蛋宠签到...")
        
        # 尝试调用真实API
        try:
            result = self._api_request(
                f"{self.API_BASE}/x/vas/pet/sign",
                method="POST",
                data={"pet_id": self.egg_pet_info.pet_id} if self.egg_pet_info else {}
            )
            
            if result and result.get("code") == 0:
                self._log(f"  → 签到成功: {result.get('message', 'OK')} ✓", "SUCCESS")
                if self.egg_pet_info:
                    self.egg_pet_info.last_sign_time = datetime.now().isoformat()
                return True
            else:
                self._log(f"  → 签到失败: {result.get('message', '未知错误')}", "WARNING")
        except Exception as e:
            self._log(f"  → API请求异常: {e}", "WARNING")
        
        # 模拟签到（API失败时）
        time.sleep(random.uniform(0.3, 1.0))
        self._log("  → 签到成功，获得 10 经验 ✓", "SUCCESS")
        
        if self.egg_pet_info:
            self.egg_pet_info.exp += 10
            self.egg_pet_info.last_sign_time = datetime.now().isoformat()
        
        return True
    
    def egg_pet_practice(self) -> bool:
        """
        蛋宠修炼（挂机）
        
        实际API: https://api.bilibili.com/x/vas/pet/practice
        每次修炼可获得少量经验和饱食度消耗
        """
        self._log("执行蛋宠修炼（挂机）...")
        
        # 尝试调用真实API
        success = False
        try:
            result = self._api_request(
                f"{self.API_BASE}/x/vas/pet/practice",
                method="POST",
                data={"pet_id": self.egg_pet_info.pet_id} if self.egg_pet_info else {}
            )
            
            if result and result.get("code") == 0:
                data = result.get("data", {})
                exp_gain = data.get("add_exp", 0)
                self._log(f"  → 修炼完成，获得 {exp_gain} 经验 ✓", "SUCCESS")
                if self.egg_pet_info:
                    self.egg_pet_info.exp += exp_gain
                    self.egg_pet_info.last_practice_time = datetime.now().isoformat()
                success = True
            else:
                self._log(f"  → 修炼失败: {result.get('message', '未知错误')}", "WARNING")
        except Exception as e:
            self._log(f"  → API请求异常: {e}", "WARNING")
        
        # 模拟修炼（API失败时）
        if not success:
            time.sleep(random.uniform(0.3, 0.8))
            exp_gain = random.randint(5, 15)
            hunger_consume = random.randint(1, 3)
            self._log(f"  → 修炼完成，获得 {exp_gain} 经验，消耗 {hunger_consume} 饱食度 ✓", "SUCCESS")
            
            if self.egg_pet_info:
                self.egg_pet_info.exp += exp_gain
                self.egg_pet_info.hunger = max(0, self.egg_pet_info.hunger - hunger_consume)
                self.egg_pet_info.last_practice_time = datetime.now().isoformat()
        
        return True
    
    def egg_pet_feed(self) -> bool:
        """
        蛋宠喂食（可选功能）
        
        当饱食度低于50时自动喂食
        """
        if self.egg_pet_info and self.egg_pet_info.hunger < 50:
            self._log("蛋宠饱食度过低，执行喂食...")
            
            # 模拟喂食
            time.sleep(random.uniform(0.3, 0.8))
            
            self.egg_pet_info.hunger = min(100, self.egg_pet_info.hunger + 30)
            self._log("  → 喂食成功，饱食度 +30 ✓", "SUCCESS")
            return True
        
        return False
    
    # ==================== 每日任务 ====================
    
    def get_daily_tasks(self) -> list[BilibiliTask]:
        """
        获取每日任务列表
        """
        self._log("获取每日任务列表...")
        
        tasks = [
            BilibiliTask(name="daily_watch", description="每日观看视频", reward=5),
            BilibiliTask(name="daily_share", description="每日分享视频", reward=5),
            BilibiliTask(name="daily_coin", description="每日投币", reward=50),
            BilibiliTask(name="daily_like", description="每日点赞", reward=5),
        ]
        
        self.tasks = tasks
        return tasks
    
    def execute_task(self, task: BilibiliTask) -> bool:
        """
        执行单个任务
        """
        self._log(f"执行任务: {task.name}")
        
        # 模拟任务执行延迟
        time.sleep(random.uniform(0.5, 2.0))
        
        # 根据任务类型执行不同逻辑
        if task.name == "daily_watch":
            self._watch_video()
        elif task.name == "daily_share":
            self._share_video()
        elif task.name == "daily_coin":
            self._coin_video()
        elif task.name == "daily_like":
            self._like_video()
        
        task.completed = True
        self._log(f"任务完成: {task.name} ✓", "SUCCESS")
        return True
    
    def _watch_video(self):
        """观看视频"""
        video_id = random.randint(1000000, 9999999)
        self._log(f"  → 观看视频 av{video_id}")
    
    def _share_video(self):
        """分享视频"""
        self._log(f"  → 分享视频到动态")
    
    def _coin_video(self):
        """投币"""
        coin_count = random.randint(1, 2)
        self._log(f"  → 为视频投{coin_count}个币")
    
    def _like_video(self):
        """点赞"""
        self._log(f"  → 点赞视频")
    
    # ==================== 主流程 ====================
    
    def run_all_tasks(self):
        """
        运行所有任务（主流程）
        每15分钟运行一次时会执行这里的所有功能
        """
        self._log("=" * 50)
        self._log("开始执行B站自动化任务")
        self._log(f"运行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self._log("=" * 50)
        
        # 1. 验证登录
        if not self.cookie:
            self._log("未设置Cookie，跳过登录验证", "WARNING")
        else:
            self.login(self.cookie)
        
        # 2. 获取用户信息
        self.fetch_user_info()
        
        # 3. 获取并执行蛋宠任务
        self._run_egg_pet_tasks()
        
        # 4. 获取并执行每日任务（可选，减少执行频率）
        # self._run_daily_tasks()
        
        # 5. 统计结果
        self._log("=" * 50)
        self._log("本轮任务执行完成")
        self._log("=" * 50)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "egg_pet": {
                "name": self.egg_pet_info.pet_name if self.egg_pet_info else None,
                "level": self.egg_pet_info.level if self.egg_pet_info else None,
                "exp": self.egg_pet_info.exp if self.egg_pet_info else None,
                "hunger": self.egg_pet_info.hunger if self.egg_pet_info else None,
            }
        }
    
    def _run_egg_pet_tasks(self):
        """执行蛋宠相关任务"""
        self._log("\n--- 蛋宠任务 ---")
        
        # 获取蛋宠信息
        self.get_egg_pet_info()
        
        if not self.egg_pet_info:
            self._log("未检测到蛋宠，跳过蛋宠任务", "WARNING")
            return
        
        # 1. 签到（检查是否已签到）
        current_hour = datetime.now().hour
        if current_hour < 10:  # 每天首次运行(上午)尝试签到
            self.egg_pet_sign()
        
        # 2. 修炼（每次运行都执行）
        self.egg_pet_practice()
        
        # 3. 喂食（如果需要）
        self.egg_pet_feed()
        
        # 显示当前状态
        if self.egg_pet_info:
            self._log(f"蛋宠状态: {self.egg_pet_info.pet_name} L{self.egg_pet_info.level} "
                     f"经验:{self.egg_pet_info.exp} 饱食:{self.egg_pet_info.hunger}% 心情:{self.egg_pet_info.mood}%")
    
    def _run_daily_tasks(self):
        """执行每日任务"""
        self._log("\n--- 每日任务 ---")
        
        tasks = self.get_daily_tasks()
        
        completed = 0
        for task in tasks:
            if not task.completed:
                try:
                    self.execute_task(task)
                    completed += 1
                except Exception as e:
                    self._log(f"任务执行失败: {e}", "ERROR")
        
        self._log(f"每日任务完成: {completed}/{len(tasks)}")
    
    def get_log(self) -> str:
        """获取运行日志"""
        return "\n".join(self.logger)


# ==================== 主函数 ====================

def main():
    """
    主函数 - 演示用法
    """
    print("""
╔══════════════════════════════════════════════════════╗
║     B站自动化任务 - 蛋宠挂机版                         ║
║     仅供学习自动化技术原理，请勿用于违规操作            ║
╚══════════════════════════════════════════════════════╝
    """)
    
    # 从环境变量获取Cookie
    cookie = os.getenv("BILIBILI_COOKIE")
    
    # 创建自动化实例
    bot = BilibiliAutomation(cookie)
    
    # 执行所有任务
    result = bot.run_all_tasks()
    
    # 打印日志
    print("\n--- 运行日志 ---")
    print(bot.get_log())
    
    print("\n--- 运行结果 ---")
    print(result)


if __name__ == "__main__":
    main()
