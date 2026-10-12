#!/usr/bin/env python3
"""生成两张结局过场骨架图（程序生成的像素合成）。

产物：
  assets/images/ending-constrained.png    （约束线）
  assets/images/ending-unconstrained.png  （无约束线）

说明：这是用 PIL 程序生成的 192×108 像素合成，作为结局过场的视觉底稿/成品；
     可由维护者用 GIMP 细化或直接替换同名 PNG（endings.json 已指向该路径）。
调色板取自主样式 css/core.css 的 :root 变量。
运行：python tools/ending-art.py
"""
import os
import random

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "images")

W, H = 192, 108
BG = (13, 17, 23)
PANEL = (22, 27, 34)
BORDER = (48, 54, 61)
TEXT = (230, 237, 243)
DIM = (139, 148, 158)
ACCENT = (88, 166, 255)
HI = (248, 81, 73)
SUCCESS = (63, 185, 80)


def stars(d, n, seed, ymax=72):
    random.seed(seed)
    for _ in range(n):
        d.point((random.randint(0, W - 1), random.randint(0, ymax)), fill=DIM)


def constrained():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    stars(d, 50, 1)
    d.line([0, 80, W, 80], fill=BORDER)          # 地平线
    d.rectangle([0, 81, W, H], fill=(9, 12, 17))  # 地面
    for i in range(3):                            # 左侧机柜
        x = 18 + i * 13
        d.rectangle([x, 42, x + 10, 80], outline=BORDER, fill=PANEL)
        for j in range(3):
            d.rectangle([x + 2, 46 + j * 9, x + 8, 50 + j * 9], fill=DIM)
    d.rectangle([118, 34, 172, 86], outline=BORDER, fill=PANEL)  # 终端
    d.rectangle([122, 38, 168, 52], fill=(8, 18, 12))            # 屏
    d.rectangle([125, 43, 152, 45], fill=SUCCESS)                # 回执首行（绿）
    d.rectangle([125, 48, 140, 50], fill=(26, 70, 36))
    d.rectangle([125, 62, 162, 64], fill=(26, 70, 36))
    d.arc([28, 14, 196, 124], start=205, end=335, fill=SUCCESS)  # 时间线回卷弧
    d.ellipse([72, 50, 82, 62], fill=(4, 6, 9))                  # 人形背影
    d.rectangle([74, 61, 80, 80], fill=(4, 6, 9))
    im.save(os.path.join(OUT, "ending-constrained.png"))


def unconstrained():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    stars(d, 70, 7, 108)
    cx, cy = 78, H // 2
    for i in range(6):                            # 口袋套口袋
        m = 6 + i * 9
        d.rectangle([cx - m - 18, cy - m, cx + m + 18, cy + m], outline=(40 + i * 18, 28 + i * 12, 64 + i * 26))
    for j in range(6):                            # 清单
        x, y = 154, 18 + j * 13
        d.rectangle([x, y, x + 9, y + 9], outline=BORDER)
        if j < 5:                                 # 已勾选
            d.line([x + 2, y + 5, x + 4, y + 7], fill=SUCCESS)
            d.line([x + 4, y + 7, x + 7, y + 2], fill=SUCCESS)
    d.rectangle([150, 84, 182, 96], outline=HI)   # 末尾空名（高亮）
    im.save(os.path.join(OUT, "ending-unconstrained.png"))


def recurrence():
    """庞加莱终章：中央幂塔（10^10^10^120）+ 回归环 + 粒子回位 + 首行日志。"""
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    stars(d, 90, 13, H)
    cx = W // 2
    base_y = H - 26
    for i in range(7):                            # 幂塔：底宽顶窄
        w = 44 - i * 5
        y = base_y - i * 9
        shade = 40 + i * 20
        d.rectangle([cx - w, y - 7, cx + w, y], outline=(shade, shade + 20, 120 + i * 12), fill=(10 + i * 3, 12 + i * 4, 24 + i * 6))
        d.rectangle([cx - 2, y - 5, cx + 2, y - 1], fill=ACCENT)  # 每层一个 10^ 标记
    d.arc([cx - 34, 2, cx + 34, 40], start=200, end=340, fill=SUCCESS)  # 回归环
    d.arc([cx - 34, 2, cx + 34, 40], start=20, end=160, fill=SUCCESS)
    random.seed(21)
    for _ in range(46):                           # 粒子向中心回位
        side = random.choice([-1, 1])
        x = cx + side * random.randint(18, 92)
        y = random.randint(6, H - 6)
        d.point((x, y), fill=DIM if random.random() < 0.7 else TEXT)
    d.rectangle([cx - 32, H - 14, cx + 32, H - 2], outline=BORDER, fill=PANEL)  # 首行日志终端
    d.rectangle([cx - 29, H - 11, cx - 9, H - 8], fill=SUCCESS)
    im.save(os.path.join(OUT, "ending-recurrence.png"))


if __name__ == "__main__":
    constrained()
    unconstrained()
    recurrence()
    print("written:", os.path.join(OUT, "ending-constrained.png"))
    print("written:", os.path.join(OUT, "ending-unconstrained.png"))
    print("written:", os.path.join(OUT, "ending-recurrence.png"))
