"""
《冰河与玉阶：天下双谋录》上卷 第十三章
BGM + 音效 生成脚本
全部使用程序合成，无版权问题
"""

import numpy as np
import wave
import struct
import os

OUTPUT_DIR = r"c:\Users\Administrator.DESKTOP-4BD88EU\WorkBuddy\20260314081837\audio"
os.makedirs(OUTPUT_DIR, exist_ok=True)

SAMPLE_RATE = 44100

def write_wav(filename, samples, sr=SAMPLE_RATE):
    """写出WAV文件"""
    path = os.path.join(OUTPUT_DIR, filename)
    samples = np.clip(samples, -1.0, 1.0)
    int_samples = (samples * 32767).astype(np.int16)
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(int_samples.tobytes())
    print(f"  已生成: {filename} ({len(samples)/sr:.1f}s)")
    return path

def t(dur): return np.linspace(0, dur, int(SAMPLE_RATE * dur), endpoint=False)
def silence(dur): return np.zeros(int(SAMPLE_RATE * dur))

def adsr(n, a=0.02, d=0.05, s_level=0.7, r=0.1):
    """ADSR包络"""
    env = np.zeros(n)
    a_n = int(a * SAMPLE_RATE)
    d_n = int(d * SAMPLE_RATE)
    r_n = int(r * SAMPLE_RATE)
    s_n = n - a_n - d_n - r_n
    if s_n < 0: s_n = 0
    if a_n > 0: env[:a_n] = np.linspace(0, 1, a_n)
    if d_n > 0: env[a_n:a_n+d_n] = np.linspace(1, s_level, d_n)
    if s_n > 0: env[a_n+d_n:a_n+d_n+s_n] = s_level
    if r_n > 0: env[n-r_n:] = np.linspace(s_level, 0, r_n)
    return env

def sine(freq, dur, amp=1.0, phase=0):
    return amp * np.sin(2 * np.pi * freq * t(dur) + phase)

def noise(dur, amp=0.1):
    return amp * (np.random.rand(int(SAMPLE_RATE * dur)) * 2 - 1)

def fade(sig, fade_in=0.5, fade_out=0.5):
    """淡入淡出"""
    n = len(sig)
    fi = int(fade_in * SAMPLE_RATE)
    fo = int(fade_out * SAMPLE_RATE)
    result = sig.copy().astype(float)
    if fi > 0 and fi <= n:
        result[:fi] *= np.linspace(0, 1, fi)
    if fo > 0 and fo <= n:
        result[n-fo:] *= np.linspace(1, 0, fo)
    return result

def mix(*tracks, weights=None):
    """混合多轨"""
    max_len = max(len(t) for t in tracks)
    result = np.zeros(max_len)
    for i, track in enumerate(tracks):
        w = weights[i] if weights else 1.0
        result[:len(track)] += track * w
    return result

def lowpass(sig, cutoff=800, sr=SAMPLE_RATE):
    """简单低通滤波"""
    from scipy.signal import butter, filtfilt
    nyq = sr / 2
    b, a = butter(2, cutoff / nyq, btype='low')
    return filtfilt(b, a, sig)

def highpass(sig, cutoff=200, sr=SAMPLE_RATE):
    from scipy.signal import butter, filtfilt
    nyq = sr / 2
    b, a = butter(2, cutoff / nyq, btype='high')
    return filtfilt(b, a, sig)

# ─────────────────────────────────────────────
# 乐器合成函数
# ─────────────────────────────────────────────

def erhu_note(freq, dur, amp=0.6):
    """二胡音色：基频+谐波+颤音"""
    tt = t(dur)
    # 颤音
    vibrato = 1 + 0.015 * np.sin(2 * np.pi * 5.5 * tt)
    tone = (
        0.5  * np.sin(2 * np.pi * freq * vibrato * tt) +
        0.25 * np.sin(2 * np.pi * freq * 2 * vibrato * tt) +
        0.12 * np.sin(2 * np.pi * freq * 3 * vibrato * tt) +
        0.06 * np.sin(2 * np.pi * freq * 4 * vibrato * tt) +
        0.02 * np.sin(2 * np.pi * freq * 5 * vibrato * tt)
    )
    # 弓弦摩擦感
    bow_noise = 0.04 * noise(dur)
    tone = tone + bow_noise
    env = adsr(len(tone), a=0.05, d=0.08, s_level=0.75, r=min(0.15, dur*0.3))
    return amp * tone * env

def xiao_note(freq, dur, amp=0.5):
    """箫音色：纯净+气息"""
    tt = t(dur)
    vibrato = 1 + 0.008 * np.sin(2 * np.pi * 4.5 * tt)
    tone = (
        0.6  * np.sin(2 * np.pi * freq * vibrato * tt) +
        0.2  * np.sin(2 * np.pi * freq * 2 * vibrato * tt) +
        0.08 * np.sin(2 * np.pi * freq * 3 * vibrato * tt)
    )
    breath = 0.06 * noise(dur)
    breath = lowpass(breath, cutoff=2000)
    tone = tone + breath
    env = adsr(len(tone), a=0.12, d=0.06, s_level=0.8, r=min(0.2, dur*0.35))
    return amp * tone * env

def pipa_note(freq, dur, amp=0.7):
    """琵琶音色：拨弦衰减"""
    tt = t(dur)
    tone = (
        0.55 * np.sin(2 * np.pi * freq * tt) +
        0.25 * np.sin(2 * np.pi * freq * 2 * tt) +
        0.12 * np.sin(2 * np.pi * freq * 3 * tt) +
        0.05 * np.sin(2 * np.pi * freq * 4 * tt) +
        0.02 * np.sin(2 * np.pi * freq * 5 * tt)
    )
    # 快速衰减包络（拨弦特征）
    decay = np.exp(-5 * tt)
    env = decay * adsr(len(tone), a=0.005, d=0.05, s_level=0.3, r=min(0.1, dur*0.4))
    click = 0.15 * np.exp(-800 * tt)  # 拨弦冲击
    return amp * (tone * env + click)

def cello_note(freq, dur, amp=0.5):
    """大提琴/低音弦：厚重"""
    tt = t(dur)
    vibrato = 1 + 0.01 * np.sin(2 * np.pi * 4.0 * tt)
    tone = (
        0.45 * np.sin(2 * np.pi * freq * vibrato * tt) +
        0.30 * np.sin(2 * np.pi * freq * 2 * vibrato * tt) +
        0.15 * np.sin(2 * np.pi * freq * 3 * vibrato * tt) +
        0.07 * np.sin(2 * np.pi * freq * 4 * vibrato * tt)
    )
    bow_noise = 0.03 * noise(dur)
    tone = tone + bow_noise
    env = adsr(len(tone), a=0.1, d=0.1, s_level=0.7, r=min(0.2, dur*0.3))
    return amp * tone * env

def drum_beat(dur=0.3, amp=0.5):
    """鼓击声"""
    tt = t(dur)
    body = amp * np.sin(2 * np.pi * 80 * tt) * np.exp(-15 * tt)
    transient = 0.5 * amp * noise(dur) * np.exp(-60 * tt)
    return body + transient

def place_notes(note_list, total_dur):
    """将音符放置到时间线上 note_list: [(time, samples), ...]"""
    total_n = int(SAMPLE_RATE * total_dur)
    result = np.zeros(total_n)
    for time_sec, samples in note_list:
        start = int(time_sec * SAMPLE_RATE)
        end = start + len(samples)
        if end > total_n:
            samples = samples[:total_n - start]
            end = total_n
        if start < total_n:
            result[start:end] += samples
    return result

# 音符频率
NOTE = {
    'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,'G3':196.00,'A3':220.00,'B3':246.94,
    'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,'G4':392.00,'A4':440.00,'B4':493.88,
    'C5':523.25,'D5':587.33,'E5':659.25,'F5':698.46,'G5':783.99,'A5':880.00,
    'C#4':277.18,'D#4':311.13,'F#4':369.99,'G#4':415.30,'A#4':466.16,
    'C#5':554.37,'D#5':622.25,'F#5':739.99,'G#5':830.61,
}

print("=" * 50)
print("开始生成《冰河与玉阶》第十三章配乐")
print("=" * 50)

# ─────────────────────────────────────────────
# 1. 整体BGM - 主题《夜行》（贯穿全章，约4分钟）
#    基调：低沉、紧张、古风悬疑
# ─────────────────────────────────────────────
print("\n[1/6] 生成主题BGM《夜行》...")

def gen_bgm_main():
    dur = 240.0  # 4分钟
    
    # === A段：室内紧张 (0-45s) ===
    # 箫 - 悠远低沉旋律
    xiao_melody_a = [
        (0.0,  xiao_note(NOTE['A3'], 3.0, 0.35)),
        (3.5,  xiao_note(NOTE['G3'], 2.0, 0.3)),
        (6.0,  xiao_note(NOTE['E3'], 2.5, 0.28)),
        (9.0,  xiao_note(NOTE['D3'], 3.0, 0.32)),
        (12.5, xiao_note(NOTE['A3'], 2.0, 0.3)),
        (15.0, xiao_note(NOTE['C4'], 3.5, 0.35)),
        (19.0, xiao_note(NOTE['B3'], 2.5, 0.3)),
        (22.0, xiao_note(NOTE['A3'], 4.0, 0.28)),
        (27.0, xiao_note(NOTE['G3'], 3.0, 0.25)),
        (31.0, xiao_note(NOTE['E3'], 3.5, 0.3)),
        (35.5, xiao_note(NOTE['D3'], 4.5, 0.28)),
        (41.0, xiao_note(NOTE['A3'], 4.0, 0.25)),
    ]
    
    # 二胡 - 低吟，情绪点缀
    erhu_a = [
        (8.0,  erhu_note(NOTE['E3'], 4.0, 0.25)),
        (20.0, erhu_note(NOTE['D3'], 3.5, 0.22)),
        (33.0, erhu_note(NOTE['A3'], 5.0, 0.28)),
    ]
    
    # 低音持续音（大提琴）
    cello_a = [
        (0.0,  cello_note(NOTE['A2'] if 'A2' in NOTE else NOTE['A3']*0.5, 12.0, 0.2)),
    ]
    # A2 手动
    A2 = 110.0
    cello_a = [
        (0.0,  cello_note(A2, 10.0, 0.18)),
        (10.0, cello_note(A2*NOTE['G3']/NOTE['A3'], 8.0, 0.18)),
        (18.0, cello_note(A2*NOTE['E3']/NOTE['A3'], 10.0, 0.16)),
        (28.0, cello_note(A2, 8.0, 0.18)),
        (36.0, cello_note(A2*NOTE['D3']/NOTE['A3'], 9.0, 0.16)),
    ]
    
    xiao_track = place_notes(xiao_melody_a, 45)
    erhu_track = place_notes(erhu_a, 45)
    cello_track = place_notes(cello_a, 45)
    seg_a = mix(xiao_track, erhu_track, cello_track, weights=[0.6, 0.55, 0.45])
    seg_a = fade(seg_a, fade_in=2.0, fade_out=0.5)
    
    # === B段：夜行街巷 (45-110s) 紧张加重 ===
    dur_b = 65
    erhu_b_notes = [
        (0.0,  erhu_note(NOTE['A3'], 2.0, 0.4)),
        (2.5,  erhu_note(NOTE['G3'], 1.5, 0.38)),
        (4.5,  erhu_note(NOTE['F3'] if 'F3' in NOTE else NOTE['E3'], 1.0, 0.35)),
        (6.0,  erhu_note(NOTE['E3'], 2.5, 0.42)),
        (9.0,  erhu_note(NOTE['D3'], 2.0, 0.38)),
        (11.5, erhu_note(NOTE['A3'], 1.5, 0.4)),
        (13.5, erhu_note(NOTE['C4'], 3.0, 0.45)),
        (17.5, erhu_note(NOTE['B3'], 2.5, 0.4)),
        (21.0, erhu_note(NOTE['A3'], 1.5, 0.42)),
        (23.0, erhu_note(NOTE['G3'], 2.0, 0.38)),
        (25.5, erhu_note(NOTE['E3'], 3.0, 0.40)),
        (29.5, erhu_note(NOTE['D3'], 2.0, 0.35)),
        (32.0, erhu_note(NOTE['A3'], 1.5, 0.4)),
        (34.0, erhu_note(NOTE['A3'], 2.0, 0.42)),
        (37.0, erhu_note(NOTE['G3'], 1.5, 0.38)),
        (39.0, erhu_note(NOTE['E3'], 2.5, 0.4)),
        (42.5, erhu_note(NOTE['D3'], 2.0, 0.38)),
        (45.5, erhu_note(NOTE['C4'], 3.0, 0.42)),
        (49.5, erhu_note(NOTE['A3'], 2.5, 0.4)),
        (52.5, erhu_note(NOTE['G3'], 2.0, 0.38)),
        (55.0, erhu_note(NOTE['E3'], 3.0, 0.35)),
        (59.0, erhu_note(NOTE['D3'], 3.0, 0.3)),
        (62.5, erhu_note(NOTE['A3'], 2.5, 0.28)),
    ]
    # 低脉冲（心跳感）
    pulse_times = np.arange(0, dur_b, 1.5)
    pulse_notes = [(pt, 0.15 * np.exp(-8 * t(0.3)) * np.sin(2*np.pi*60*t(0.3))) for pt in pulse_times]
    
    xiao_b = [
        (5.0,  xiao_note(NOTE['D3'], 6.0, 0.2)),
        (18.0, xiao_note(NOTE['E3'], 5.0, 0.18)),
        (32.0, xiao_note(NOTE['A3'], 7.0, 0.2)),
        (50.0, xiao_note(NOTE['G3'], 5.0, 0.18)),
    ]
    cello_b = [(i*8.0, cello_note(A2, 8.5, 0.15)) for i in range(8)]
    
    erhu_track_b = place_notes(erhu_b_notes, dur_b)
    pulse_track = place_notes(pulse_notes, dur_b)
    xiao_track_b = place_notes(xiao_b, dur_b)
    cello_track_b = place_notes(cello_b, dur_b)
    seg_b = mix(erhu_track_b, pulse_track, xiao_track_b, cello_track_b, weights=[0.55, 0.3, 0.4, 0.35])
    seg_b = fade(seg_b, fade_in=1.0, fade_out=0.5)
    
    # === C段：回忆总督府 (110-140s) 温暖短暂 ===
    dur_c = 30
    pipa_notes = [
        (0.0,  pipa_note(NOTE['E5'], 0.8, 0.5)),
        (1.0,  pipa_note(NOTE['D5'], 0.8, 0.48)),
        (2.0,  pipa_note(NOTE['C5'], 1.2, 0.52)),
        (3.5,  pipa_note(NOTE['A4'], 1.5, 0.5)),
        (5.5,  pipa_note(NOTE['G4'], 0.8, 0.48)),
        (6.5,  pipa_note(NOTE['A4'], 0.8, 0.5)),
        (7.5,  pipa_note(NOTE['E5'], 1.2, 0.52)),
        (9.2,  pipa_note(NOTE['D5'], 0.8, 0.48)),
        (10.2, pipa_note(NOTE['C5'], 1.5, 0.5)),
        (12.0, pipa_note(NOTE['A4'], 2.0, 0.45)),
        (14.5, pipa_note(NOTE['G4'], 0.8, 0.42)),
        (15.5, pipa_note(NOTE['A4'], 0.8, 0.44)),
        (16.5, pipa_note(NOTE['C5'], 1.0, 0.45)),
        (18.0, pipa_note(NOTE['D5'], 1.5, 0.42)),
        (20.0, pipa_note(NOTE['E5'], 2.0, 0.4)),
        (22.5, pipa_note(NOTE['D5'], 1.5, 0.35)),
        (24.5, pipa_note(NOTE['C5'], 1.5, 0.3)),
        (26.5, pipa_note(NOTE['A4'], 3.0, 0.25)),
    ]
    erhu_c = [
        (4.0,  erhu_note(NOTE['C5'], 4.0, 0.3)),
        (13.0, erhu_note(NOTE['E5'], 5.0, 0.28)),
        (22.0, erhu_note(NOTE['A4'], 6.0, 0.25)),
    ]
    pipa_track = place_notes(pipa_notes, dur_c)
    erhu_track_c = place_notes(erhu_c, dur_c)
    seg_c = mix(pipa_track, erhu_track_c, weights=[0.65, 0.45])
    seg_c = fade(seg_c, fade_in=1.5, fade_out=2.0)
    
    # === D段：码头潜伏 (140-210s) 压抑危险 ===
    dur_d = 70
    # 低沉持续和声 + 不和谐音
    xiao_d = [
        (0.0,  xiao_note(NOTE['D3'], 12.0, 0.28)),
        (13.0, xiao_note(NOTE['C#4'] if 'C#4' in NOTE else NOTE['D4']*0.98, 10.0, 0.25)),
        (24.0, xiao_note(NOTE['A3'], 12.0, 0.3)),
        (37.0, xiao_note(NOTE['G3'], 10.0, 0.25)),
        (48.0, xiao_note(NOTE['E3'], 12.0, 0.28)),
        (61.0, xiao_note(NOTE['D3'], 9.0, 0.25)),
    ]
    erhu_d = [
        (5.0,  erhu_note(NOTE['A3'], 8.0, 0.35)),
        (20.0, erhu_note(NOTE['G3'], 7.0, 0.32)),
        (35.0, erhu_note(NOTE['E3'], 9.0, 0.35)),
        (50.0, erhu_note(NOTE['D3'], 8.0, 0.3)),
        (62.0, erhu_note(NOTE['A3'], 7.0, 0.28)),
    ]
    cello_d = [(i*7.0, cello_note(A2 * 0.89, 7.5, 0.22)) for i in range(10)]
    # 紧张脉冲
    tension_times = np.arange(0, dur_d, 2.0)
    tension = [(tt, 0.1 * np.exp(-15 * t(0.2)) * noise(0.2, 0.8)) for tt in tension_times]
    
    xiao_track_d = place_notes(xiao_d, dur_d)
    erhu_track_d = place_notes(erhu_d, dur_d)
    cello_track_d = place_notes(cello_d, dur_d)
    tension_track = place_notes(tension, dur_d)
    seg_d = mix(xiao_track_d, erhu_track_d, cello_track_d, tension_track, weights=[0.5, 0.55, 0.4, 0.25])
    seg_d = fade(seg_d, fade_in=1.0, fade_out=0.5)
    
    # === E段：攀爬望楼 (210-240s) 咬牙坚持，逐渐紧张升华 ===
    dur_e = 30
    erhu_e = [
        (0.0,  erhu_note(NOTE['A3'], 1.5, 0.5)),
        (1.8,  erhu_note(NOTE['C4'], 1.2, 0.52)),
        (3.2,  erhu_note(NOTE['D4'], 1.5, 0.55)),
        (5.0,  erhu_note(NOTE['E4'], 2.0, 0.58)),
        (7.5,  erhu_note(NOTE['D4'], 1.2, 0.55)),
        (9.0,  erhu_note(NOTE['C4'], 1.5, 0.52)),
        (11.0, erhu_note(NOTE['A3'], 1.2, 0.5)),
        (12.5, erhu_note(NOTE['C4'], 1.0, 0.55)),
        (14.0, erhu_note(NOTE['E4'], 1.5, 0.58)),
        (16.0, erhu_note(NOTE['G4'], 2.0, 0.62)),
        (18.5, erhu_note(NOTE['A4'], 2.5, 0.65)),
        (21.5, erhu_note(NOTE['G4'], 1.5, 0.6)),
        (23.5, erhu_note(NOTE['E4'], 1.5, 0.55)),
        (25.5, erhu_note(NOTE['D4'], 2.0, 0.5)),
        (28.0, erhu_note(NOTE['A3'], 2.0, 0.45)),
    ]
    xiao_e = [
        (3.0, xiao_note(NOTE['E4'], 6.0, 0.4)),
        (13.0, xiao_note(NOTE['G4'], 7.0, 0.45)),
        (23.0, xiao_note(NOTE['A4'], 7.0, 0.5)),
    ]
    pipa_e = [(i*1.5, pipa_note(NOTE['A3'], 0.6, 0.25)) for i in range(20)]
    
    erhu_track_e = place_notes(erhu_e, dur_e)
    xiao_track_e = place_notes(xiao_e, dur_e)
    pipa_track_e = place_notes(pipa_e, dur_e)
    seg_e = mix(erhu_track_e, xiao_track_e, pipa_track_e, weights=[0.65, 0.5, 0.3])
    seg_e = fade(seg_e, fade_in=0.5, fade_out=3.0)
    
    # 拼接所有段落
    bgm = np.concatenate([seg_a, seg_b, seg_c, seg_d, seg_e])
    
    # 整体轻微混响（简单延迟模拟）
    delay_samples = int(0.06 * SAMPLE_RATE)
    reverb = np.zeros(len(bgm) + delay_samples)
    reverb[:len(bgm)] += bgm
    reverb[delay_samples:delay_samples+len(bgm)] += bgm * 0.2
    reverb = reverb[:len(bgm)]
    
    return np.clip(reverb * 0.75, -1, 1)

bgm = gen_bgm_main()
write_wav("01_BGM_夜行_主题.wav", bgm)


# ─────────────────────────────────────────────
# 2. 音效：跳窗落雪
# ─────────────────────────────────────────────
print("\n[2/6] 生成音效：跳窗落雪...")

def gen_sfx_jump_snow():
    dur = 3.0
    # 跳起前短暂脚步
    footstep = 0.4 * np.exp(-20 * t(0.15)) * noise(0.15, 0.9)
    # 落地闷响（低频冲击）
    impact_t = t(0.8)
    impact_body = 1.0 * np.exp(-10 * impact_t) * np.sin(2*np.pi*55*impact_t)
    impact_noise = 0.6 * np.exp(-20 * impact_t) * (np.random.rand(len(impact_t))*2-1)
    impact = impact_body + impact_noise
    impact = lowpass(impact, cutoff=400)
    # 雪声（碎落）
    snow_t = t(1.2)
    snow = 0.35 * (np.random.rand(len(snow_t))*2-1) * np.exp(-3 * snow_t)
    snow = lowpass(snow, cutoff=3000)
    snow = highpass(snow, cutoff=200)
    # 落地后颤抖声（衣物摩擦）
    cloth_t = t(0.5)
    cloth = 0.15 * (np.random.rand(len(cloth_t))*2-1) * np.exp(-8 * cloth_t)
    cloth = lowpass(cloth, cutoff=2000)
    
    total = int(SAMPLE_RATE * dur)
    result = np.zeros(total)
    # 0.2s跳脚
    n1 = len(footstep)
    result[:n1] += footstep
    # 0.5s落地
    n2 = len(impact)
    s2 = int(0.5 * SAMPLE_RATE)
    result[s2:s2+n2] += impact
    # 0.6s雪飞溅
    n3 = len(snow)
    s3 = int(0.6 * SAMPLE_RATE)
    if s3+n3 <= total: result[s3:s3+n3] += snow
    # 1.5s衣物
    n4 = len(cloth)
    s4 = int(1.5 * SAMPLE_RATE)
    if s4+n4 <= total: result[s4:s4+n4] += cloth
    
    return fade(result, fade_in=0.05, fade_out=0.3)

write_wav("02_SFX_跳窗落雪.wav", gen_sfx_jump_snow())


# ─────────────────────────────────────────────
# 3. 音效：雪地脚步
# ─────────────────────────────────────────────
print("\n[3/6] 生成音效：雪地脚步...")

def gen_sfx_snow_footsteps():
    dur = 8.0
    total = int(SAMPLE_RATE * dur)
    result = np.zeros(total)
    # 每步间隔 ~0.5s，共15步，先快后慢（紧张到谨慎）
    intervals = [0.45, 0.48, 0.5, 0.52, 0.55, 0.6, 0.65, 0.65, 0.7, 0.7, 0.75, 0.75, 0.8, 0.8, 0.85]
    pos = 0.3
    for i, interval in enumerate(intervals):
        step_dur = 0.18
        step_t = t(step_dur)
        # 雪地踩踏：低频+高频碎雪
        crunch_low = 0.5 * np.exp(-25 * step_t) * np.sin(2*np.pi*120*step_t)
        crunch_hi = 0.3 * (np.random.rand(len(step_t))*2-1) * np.exp(-30 * step_t)
        crunch_hi = lowpass(crunch_hi, cutoff=4000)
        step = crunch_low + crunch_hi
        # 越走越轻（谨慎）
        amp = 0.8 - i * 0.02
        start = int(pos * SAMPLE_RATE)
        end = start + len(step)
        if end <= total:
            result[start:end] += amp * step
        pos += interval
    
    return fade(result, fade_in=0.1, fade_out=0.5)

write_wav("03_SFX_雪地脚步.wav", gen_sfx_snow_footsteps())


# ─────────────────────────────────────────────
# 4. 音效：远处狗吠
# ─────────────────────────────────────────────
print("\n[4/6] 生成音效：远处狗吠...")

def gen_sfx_dog_bark():
    dur = 5.0
    total = int(SAMPLE_RATE * dur)
    result = np.zeros(total)
    
    def bark(pitch=440, amp=0.8, dur_b=0.25):
        bt = t(dur_b)
        # 犬吠基频+谐波
        body = (
            0.5 * np.sin(2*np.pi*pitch*bt) +
            0.3 * np.sin(2*np.pi*pitch*1.5*bt) +
            0.15 * np.sin(2*np.pi*pitch*2.2*bt)
        )
        rough = 0.2 * (np.random.rand(len(bt))*2-1)
        rough = lowpass(rough, cutoff=3000)
        b = body + rough
        env = np.exp(-12 * bt)
        return amp * b * env
    
    # 3声吠叫，距离感（低通处理）
    bark_times = [0.3, 0.7, 1.1, 2.8, 3.2, 3.6]
    pitches    = [380, 360, 350, 370, 355, 340]
    amps       = [0.6, 0.55, 0.5, 0.45, 0.4, 0.38]  # 远处，压低
    
    for bt_start, pitch, amp in zip(bark_times, pitches, amps):
        b = bark(pitch, amp)
        # 距离感：低通
        b = lowpass(b, cutoff=1200)
        start = int(bt_start * SAMPLE_RATE)
        end = start + len(b)
        if end <= total:
            result[start:end] += b
    
    # 加环境底噪（夜风）
    wind = 0.04 * (np.random.rand(total)*2-1)
    wind = lowpass(wind, cutoff=500)
    result += wind
    
    return fade(result, fade_in=0.3, fade_out=0.5)

write_wav("04_SFX_远处狗吠.wav", gen_sfx_dog_bark())


# ─────────────────────────────────────────────
# 5. 音效：更夫梆子声
# ─────────────────────────────────────────────
print("\n[5/6] 生成音效：更夫梆子声...")

def gen_sfx_geng_bang():
    dur = 6.0
    total = int(SAMPLE_RATE * dur)
    result = np.zeros(total)
    
    def bang(amp=1.0):
        """梆子：木制打击，短促清脆"""
        bd = 0.5
        bt = t(bd)
        # 主频~800Hz木击声
        body = (
            0.6 * np.sin(2*np.pi*820*bt) +
            0.25 * np.sin(2*np.pi*1640*bt) +
            0.1  * np.sin(2*np.pi*2460*bt)
        )
        click = 0.4 * (np.random.rand(len(bt))*2-1) * np.exp(-80*bt)
        click = lowpass(click, cutoff=5000)
        b = body + click
        env = np.exp(-18 * bt)
        # 远处：轻微低通
        b = b * env * amp
        b = lowpass(b, cutoff=2500)
        return b
    
    # 三更：梆子敲三声
    for i in range(3):
        b = bang(amp=0.65)
        start = int((0.5 + i * 0.9) * SAMPLE_RATE)
        end = start + len(b)
        if end <= total: result[start:end] += b
    
    # 哼调（更夫）- 简单单音模拟
    hum_t = t(3.0)
    hum = 0.12 * np.sin(2*np.pi*220*hum_t) * (1 + 0.3*np.sin(2*np.pi*3*hum_t))
    hum *= np.concatenate([np.linspace(0,1,int(0.2*SAMPLE_RATE)),
                           np.ones(int(2.4*SAMPLE_RATE)),
                           np.linspace(1,0,int(0.4*SAMPLE_RATE))])
    s_hum = int(2.5 * SAMPLE_RATE)
    result[s_hum:s_hum+len(hum)] += hum
    
    # 脚步声（远去）
    for i in range(5):
        step_t2 = t(0.15)
        step2 = 0.2 * np.exp(-25*step_t2) * (np.random.rand(len(step_t2))*2-1)
        step2 = lowpass(step2, cutoff=800)
        s_step = int((3.5 + i * 0.55) * SAMPLE_RATE)
        e_step = s_step + len(step2)
        if e_step <= total: result[s_step:e_step] += step2 * (1 - i*0.1)
    
    return fade(result, fade_in=0.2, fade_out=1.0)

write_wav("05_SFX_更夫梆子声.wav", gen_sfx_geng_bang())


# ─────────────────────────────────────────────
# 6. 氛围音：冬夜码头
# ─────────────────────────────────────────────
print("\n[6/6] 生成氛围音：冬夜码头...")

def gen_amb_winter_dock():
    dur = 60.0
    total = int(SAMPLE_RATE * dur)
    
    # 朔风：低频宽带噪声
    wind = np.random.rand(total)*2-1
    from scipy.signal import butter, filtfilt
    b1, a1 = butter(2, 600/(SAMPLE_RATE/2), btype='low')
    wind = filtfilt(b1, a1, wind)
    # 风的强弱变化
    wind_env = 0.5 + 0.5*np.sin(2*np.pi*0.05*np.linspace(0,dur,total))
    wind = 0.18 * wind * wind_env
    
    # 船体冰面摩擦（间歇性低沉摩擦声）
    creak = np.zeros(total)
    for creak_t in [5.0, 12.0, 18.5, 27.0, 34.0, 42.5, 50.0, 56.0]:
        cd = 1.5 + np.random.rand() * 1.0
        ct = t(cd)
        c = 0.15 * (np.random.rand(len(ct))*2-1) * (1 + np.sin(2*np.pi*1.5*ct)) * 0.5
        c = lowpass(c, cutoff=300)
        cs = int(creak_t * SAMPLE_RATE)
        ce = cs + len(c)
        if ce <= total: creak[cs:ce] += c
    
    # 冰面偶尔裂动声
    ice_crack = np.zeros(total)
    for ict in [8.0, 23.0, 38.5, 52.0]:
        icd = 0.3
        ic = 0.3 * (np.random.rand(int(SAMPLE_RATE*icd))*2-1) * np.exp(-15*t(icd))
        ic = lowpass(ic, cutoff=1500)
        ics = int(ict * SAMPLE_RATE)
        ice_crack[ics:ics+len(ic)] += ic
    
    # 防风灯摇曳（金属轻响）
    lamp = np.zeros(total)
    for lt in [4.5, 9.0, 15.5, 22.0, 29.5, 37.0, 44.0, 51.5]:
        ld = 0.2
        l = 0.08 * np.sin(2*np.pi*1800*t(ld)) * np.exp(-20*t(ld))
        ls = int(lt * SAMPLE_RATE)
        lamp[ls:ls+len(l)] += l
    
    result = wind + creak + ice_crack + lamp
    return fade(result, fade_in=3.0, fade_out=3.0)

write_wav("06_AMB_冬夜码头.wav", gen_amb_winter_dock())

print("\n" + "=" * 50)
print("全部音频生成完成！")
print(f"输出目录: {OUTPUT_DIR}")
print("文件列表：")
for f in sorted(os.listdir(OUTPUT_DIR)):
    path = os.path.join(OUTPUT_DIR, f)
    size = os.path.getsize(path)
    print(f"  {f}  ({size//1024} KB)")
print("=" * 50)
