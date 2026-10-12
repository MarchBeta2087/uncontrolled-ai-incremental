#!/usr/bin/env python3
"""生成 v0.6 音频素材（程序合成，OGG/Vorbis）。

产物（assets/audio/）：
  click.ogg buy.ogg tech.ogg prestige.ogg achievement.ogg universe.ogg ending.ogg   （音效）
  bgm.ogg                                                                           （环境循环）

说明：
  - 纯程序合成（numpy/scipy + soundfile），项目自产、无外部素材，按 CC BY-SA 4.0 登记；
  - 这些文件用于替换 config/audio.json 里的 `synth`（经 `file` 字段接入，引擎无需改逻辑）；
  - 依赖：numpy / scipy / soundfile（`pip install soundfile`）。运行：python tools/audio-gen.py
"""
import os

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "audio")
SR = 44100


def _env(n, attack=0.006, release=0.06):
    e = np.ones(n)
    a = min(n, int(SR * attack))
    r = min(n, int(SR * release))
    if a > 0:
        e[:a] = np.linspace(0.0, 1.0, a)
    if r > 0:
        e[-r:] = np.linspace(1.0, 0.0, r)
    return e


def _wave(phase, kind):
    if kind == "sine":
        return np.sin(phase)
    if kind == "square":
        return np.sign(np.sin(phase))
    if kind == "triangle":
        return (2.0 / np.pi) * np.arcsin(np.sin(phase))
    if kind == "sawtooth":
        return 2.0 * ((phase / (2.0 * np.pi)) % 1.0) - 1.0
    return np.sin(phase)


def tone(f0, f1, dur, kind="sine", vol=0.2, chord=(1.0,), attack=0.006, release=0.06, detune=0.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    if f1 and f1 != f0:
        freq = f0 * (f1 / f0) ** (t / max(dur, 1e-6))
    else:
        freq = np.full(n, float(f0))
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    out = np.zeros(n)
    for ratio in chord:
        out += _wave(phase * ratio, kind)
        if detune:
            out += 0.5 * _wave(phase * ratio * (1.0 + detune), kind)
    out /= len(chord) * (1.5 if detune else 1.0)
    out *= _env(n, attack, release) * vol
    return out


def mix(*layers):
    n = max(len(x) for x in layers)
    out = np.zeros(n)
    for x in layers:
        out[: len(x)] += x
    return out


def soft_clip(x, drive=1.0):
    x = np.tanh(x * drive)
    peak = float(np.max(np.abs(x))) or 1.0
    return x / peak * 0.9


def write(name, x):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    sf.write(path, x.astype(np.float32), SR, format="OGG", subtype="VORBIS")
    print("written:", path, f"{len(x)/SR:.3f}s")


def sfx_click():
    return soft_clip(tone(520, 520, 0.05, "square", 0.22, release=0.03))


def sfx_buy():
    return soft_clip(mix(
        tone(440, 660, 0.10, "triangle", 0.22),
        tone(880, 1320, 0.08, "sine", 0.08),
    ))


def sfx_tech():
    return soft_clip(mix(
        tone(380, 820, 0.22, "sine", 0.22),
        tone(190, 410, 0.22, "triangle", 0.10),
    ))


def sfx_prestige():
    return soft_clip(mix(
        tone(300, 900, 0.55, "sawtooth", 0.18, chord=(1.0, 1.5), detune=0.004),
        tone(150, 450, 0.55, "sine", 0.12),
    ), 1.2)


def sfx_achievement():
    return soft_clip(mix(
        tone(700, 1050, 0.32, "triangle", 0.20, chord=(1.0, 1.25)),
        tone(1400, 2100, 0.28, "sine", 0.07),
    ))


def sfx_universe():
    return soft_clip(mix(
        tone(110, 1600, 1.5, "sine", 0.26, chord=(1.0, 1.5, 2.0), release=0.4),
        tone(55, 800, 1.5, "triangle", 0.12, release=0.4),
    ), 1.1)


def sfx_ending():
    return soft_clip(mix(
        tone(220, 660, 2.2, "sine", 0.24, chord=(1.0, 1.5, 2.0, 2.5), release=0.8),
        tone(110, 330, 2.2, "triangle", 0.12, release=0.8),
    ), 1.1)


def bgm():
    """~16s 环境循环：慢和弦垫 + 柔和琶音；音符在循环边界前收尾，便于无缝 loop。"""
    total = 16.0
    n = int(SR * total)
    track = np.zeros(n)

    def place(x, at):
        i = int(SR * at)
        j = min(n, i + len(x))
        track[i:j] += x[: j - i]

    # 和弦垫（Am - F - C - G，每 4s 一段）
    chords = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63),
              (261.63, 329.63, 392.0), (196.0, 246.94, 293.66)]
    for k, chord in enumerate(chords):
        for f in chord:
            place(tone(f, f, 3.8, "sine", 0.06, attack=0.6, release=1.2), k * 4.0)
    # 琶音（每 0.5s 一个音，五声音阶）
    scale = [440.0, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25]
    for i in range(int(total / 0.5)):
        f = scale[i % len(scale)]
        place(tone(f, f, 0.45, "triangle", 0.045, attack=0.01, release=0.3), i * 0.5)
    # 低频垫
    place(tone(55, 55, total, "sine", 0.05, attack=1.0, release=1.0), 0.0)
    return soft_clip(track, 1.0)


if __name__ == "__main__":
    write("click.ogg", sfx_click())
    write("buy.ogg", sfx_buy())
    write("tech.ogg", sfx_tech())
    write("prestige.ogg", sfx_prestige())
    write("achievement.ogg", sfx_achievement())
    write("universe.ogg", sfx_universe())
    write("ending.ogg", sfx_ending())
    write("bgm.ogg", bgm())
