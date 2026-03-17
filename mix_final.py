"""
混音合成：将BGM + 各段音效合并成一个完整预览版本
模拟有声书实际播放效果（留出人声空间）
"""
import numpy as np
import wave
import os
from scipy.signal import butter, filtfilt

AUDIO_DIR = r"c:\Users\Administrator.DESKTOP-4BD88EU\WorkBuddy\20260314081837\audio"
SR = 44100

def read_wav(filename):
    path = os.path.join(AUDIO_DIR, filename)
    with wave.open(path, 'r') as f:
        n = f.getnframes()
        raw = f.readframes(n)
        data = np.frombuffer(raw, dtype=np.int16).astype(float) / 32767.0
    return data

def write_wav(filename, samples):
    path = os.path.join(AUDIO_DIR, filename)
    samples = np.clip(samples, -1.0, 1.0)
    int_samples = (samples * 32767).astype(np.int16)
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(int_samples.tobytes())
    dur = len(samples)/SR
    print(f"  输出: {filename}  ({dur:.1f}s, {os.path.getsize(path)//1024}KB)")

def overlay(base, overlay_sig, start_sec, vol=1.0):
    """将overlay_sig叠加到base的指定位置"""
    result = base.copy()
    start = int(start_sec * SR)
    end = start + len(overlay_sig)
    if end > len(result):
        result = np.concatenate([result, np.zeros(end - len(result))])
    result[start:end] += overlay_sig * vol
    return result

def fade_clip(sig, fi=0.05, fo=0.1):
    s = sig.copy()
    fi_n = int(fi * SR); fo_n = int(fo * SR)
    if fi_n > 0: s[:fi_n] *= np.linspace(0, 1, fi_n)
    if fo_n > 0: s[-fo_n:] *= np.linspace(1, 0, fo_n)
    return s

print("读取音频文件...")
bgm    = read_wav("01_BGM_夜行_主题.wav")
jump   = read_wav("02_SFX_跳窗落雪.wav")
steps  = read_wav("03_SFX_雪地脚步.wav")
dog    = read_wav("04_SFX_远处狗吠.wav")
bang   = read_wav("05_SFX_更夫梆子声.wav")
dock   = read_wav("06_AMB_冬夜码头.wav")

print("开始混音合成...")

# BGM作为底层（压低到-12dB，为人声让出空间）
mix = bgm * 0.25

# === 场景时间轴（按朗读节奏估算） ===
# 段1: 换夜行衣  0s - 30s
#   BGM A段已在其中，无需额外叠加

# 段2: 跳窗入雪  约 32s
mix = overlay(mix, fade_clip(jump, fi=0.02, fo=0.2), start_sec=32.0, vol=0.9)

# 段3: 夜行街巷  35s - 75s，雪地脚步贯穿
steps_loop = np.tile(steps, 5)[:int(40*SR)]  # 循环40s
mix = overlay(mix, steps_loop * 0.35, start_sec=35.0)

# 段4: 狗吠惊吓  约 55s
mix = overlay(mix, fade_clip(dog, fi=0.1, fo=0.5), start_sec=55.0, vol=0.85)

# 段5: 更夫梆子  约 85s
mix = overlay(mix, fade_clip(bang, fi=0.05, fo=0.5), start_sec=85.0, vol=0.8)

# 段6: 回忆插曲  110s - 140s，BGM C段已切温暖

# 段7: 码头氛围  145s - 210s，叠加码头环境音
dock_clip = dock[:int(65*SR)]
mix = overlay(mix, fade_clip(dock_clip, fi=3.0, fo=3.0), start_sec=145.0, vol=0.4)

# 整体限幅
from scipy.signal import butter, filtfilt
# 轻微压缩（防止超限）
peak = np.max(np.abs(mix))
if peak > 0.85:
    mix = mix / peak * 0.85

# 最终淡出
fade_out_n = int(3.0 * SR)
mix[-fade_out_n:] *= np.linspace(1, 0, fade_out_n)

write_wav("00_完整混音_第十三章配乐.wav", mix)
print("\n混音完成！")
