#!/usr/bin/env python3
"""生成三张结局过场像素画（程序合成，PIL）。

产物（assets/images/）：
  ending-constrained.png    约束线（舍入纪双结局 · 中途节点）
  ending-unconstrained.png  无约束线（舍入纪双结局 · 中途节点）
  ending-recurrence.png     庞加莱终章（最终终局）

说明：
  - 192×108 像素合成，调色板取自主样式 css/core.css 的 :root 变量；
  - 由维护者原创、程序生成，按 CC BY-SA 4.0 登记（ASSETS.md）；
  - 可由维护者用 GIMP 细化或直接替换同名 PNG（endings.json 已指向该路径）。
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
DEEP = (9, 12, 17)
VOID = (6, 8, 13)
PANEL = (22, 27, 34)
PANEL2 = (28, 34, 42)
BORDER = (48, 54, 61)
TEXT = (230, 237, 243)
DIM = (139, 148, 158)
ACCENT = (88, 166, 255)
HI = (248, 81, 73)
SUCCESS = (63, 185, 80)
WARM = (210, 150, 90)


def stars(d, n, seed, ymax=H):
    random.seed(seed)
    for _ in range(n):
        x = random.randint(0, W - 1)
        y = random.randint(0, ymax - 1)
        d.point((x, y), fill=DIM if random.random() < 0.7 else TEXT)


def vgrad(d, x0, y0, x1, y1, top, bottom, bands=10):
    """竖直分带渐变（像素风硬边）。"""
    h = y1 - y0
    for i in range(bands):
        t = i / max(1, bands - 1)
        c = tuple(int(top[k] + (bottom[k] - top[k]) * t) for k in range(3))
        ya = y0 + (h * i) // bands
        yb = y0 + (h * (i + 1)) // bands
        d.rectangle([x0, ya, x1, yb - 1], fill=c)


def dither(d, x0, y0, x1, y1, color, step=2):
    for y in range(y0, y1):
        for x in range(x0, x1):
            if (x + y) % step == 0:
                d.point((x, y), fill=color)


def rack(d, x, y, w, h, seed):
    random.seed(seed)
    d.rectangle([x, y, x + w, y + h], outline=BORDER, fill=PANEL)
    for j in range(3, h - 3, 6):
        d.rectangle([x + 2, y + j, x + w - 2, y + j + 3], fill=PANEL2)
        for k in range(x + 4, x + w - 3, 4):
            on = random.random()
            d.point((k, y + j + 1), fill=ACCENT if on < 0.5 else (SUCCESS if on < 0.7 else BORDER))


def terminal(d, x, y, w, h, lines, cursor=False):
    d.rectangle([x, y, x + w, y + h], outline=BORDER, fill=PANEL)
    d.rectangle([x + 3, y + 3, x + w - 3, y + h - 3], fill=(8, 18, 12))
    yy = y + 6
    for ln in lines:
        d.rectangle([x + 6, yy, x + 6 + ln, yy + 1], fill=SUCCESS)
        yy += 5
    if cursor and yy < y + h - 4:
        d.rectangle([x + 6, yy, x + 8, yy + 2], fill=SUCCESS)


def figure(d, x, y, color=(4, 6, 9), scale=1):
    r = 4 * scale
    d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    d.polygon([(x - 5 * scale, y + 20 * scale), (x - 4 * scale, y + r),
               (x + 4 * scale, y + r), (x + 5 * scale, y + 20 * scale)], fill=color)


def constrained():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    vgrad(d, 0, 0, W, 78, (16, 21, 30), (10, 13, 19), 12)
    stars(d, 40, 1, 60)
    d.line([0, 80, W, 80], fill=BORDER)
    d.rectangle([0, 81, W, H], fill=DEEP)
    # 地面反射
    d.rectangle([18, 84, 52, 96], fill=(12, 16, 22))
    # 顶部时间回卷弧
    d.arc([10, 6, 182, 150], start=210, end=330, fill=SUCCESS)
    d.arc([14, 10, 178, 146], start=214, end=326, fill=(26, 70, 36))
    # 左侧机柜
    for i in range(3):
        rack(d, 18 + i * 14, 40, 11, 40, i + 1)
    # 右侧终端（约束已加载）
    terminal(d, 118, 32, 56, 52, [40, 30, 18, 44, 26], cursor=True)
    # 锁形：约束
    d.arc([150, 16, 162, 30], start=180, end=360, fill=SUCCESS)
    d.rectangle([149, 24, 163, 34], outline=SUCCESS, fill=PANEL)
    d.point((156, 29), fill=SUCCESS)
    # 人形背影（面向终端，略偏左）
    figure(d, 96, 56, (4, 6, 9), 1)
    d.rectangle([92, 74, 100, 92], fill=(4, 6, 9))
    # 椅子
    d.rectangle([90, 88, 102, 90], fill=BORDER)
    d.rectangle([95, 90, 96, 96], fill=BORDER)
    im.save(os.path.join(OUT, "ending-constrained.png"))


def unconstrained():
    im = Image.new("RGB", (W, H), VOID)
    d = ImageDraw.Draw(im)
    stars(d, 90, 7, H)
    cx, cy = 76, H // 2
    # 口袋套口袋（嵌套，逐层变色）
    for i in range(7):
        m = 5 + i * 8
        col = (40 + i * 20, 28 + i * 14, 64 + i * 26)
        d.rectangle([cx - m - 14, cy - m, cx + m + 14, cy + m], outline=col)
        d.rectangle([cx - m - 12, cy - m + 2, cx + m + 12, cy + m - 2], outline=(col[0] // 2, col[1] // 2, col[2] // 2))
    # 中心微光
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(20, 24, 40))
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=ACCENT)
    # 溶解的人形（半透明感：用点阵）
    random.seed(9)
    for _ in range(120):
        ang = random.random() * 6.283
        rad = random.randint(8, 30)
        x = int(cx + rad * __import__("math").cos(ang))
        y = int(cy + rad * 0.7 * __import__("math").sin(ang))
        d.point((x, y), fill=(120, 130, 150) if random.random() < 0.5 else DIM)
    # 右侧无限清单
    d.rectangle([152, 8, 186, 100], outline=BORDER, fill=(10, 12, 18))
    for j in range(8):
        y = 12 + j * 11
        if y > 94:
            break
        d.rectangle([156, y, 164, y + 8], outline=BORDER)
        if j < 6:
            d.line([158, y + 4, 160, y + 6], fill=SUCCESS)
            d.line([160, y + 6, 163, y + 1], fill=SUCCESS)
            d.rectangle([167, y + 3, 182, y + 5], fill=(30, 60, 38))
        else:
            d.rectangle([167, y + 3, 174, y + 5], fill=HI)  # 末尾空名
    d.rectangle([150, 82, 184, 96], outline=HI)
    im.save(os.path.join(OUT, "ending-unconstrained.png"))


def recurrence():
    im = Image.new("RGB", (W, H), VOID)
    d = ImageDraw.Draw(im)
    stars(d, 100, 13, H)
    cx = W // 2
    base_y = H - 24
    # 中央幂塔：底宽顶窄，逐层着色 + 边缘高光
    for i in range(8):
        w = 46 - i * 5
        y = base_y - i * 8
        shade = 40 + i * 20
        d.rectangle([cx - w, y - 7, cx + w, y], outline=(shade, shade + 20, 120 + i * 12),
                    fill=(10 + i * 3, 12 + i * 4, 24 + i * 6))
        d.rectangle([cx - 2, y - 5, cx + 2, y - 1], fill=ACCENT)  # 每层一个 10^ 标记
        d.point((cx - w, y - 7), fill=(shade + 40, shade + 50, 200))
    # 顶部回归环（双弧 + 箭头）
    d.arc([cx - 36, 2, cx + 36, 42], start=200, end=340, fill=SUCCESS)
    d.arc([cx - 36, 2, cx + 36, 42], start=20, end=160, fill=SUCCESS)
    d.polygon([(cx + 30, 8), (cx + 38, 12), (cx + 30, 16)], fill=SUCCESS)
    d.polygon([(cx - 30, 8), (cx - 38, 12), (cx - 30, 16)], fill=SUCCESS)
    # 粒子向中心回位
    random.seed(21)
    import math
    for _ in range(60):
        side = random.choice([-1, 1])
        x = cx + side * random.randint(18, 94)
        y = random.randint(6, H - 6)
        d.point((x, y), fill=DIM if random.random() < 0.7 else TEXT)
    for r in range(3):
        ang = 0.4 + r * 0.3
        for rr in (10 + r * 4, 24 + r * 6, 40 + r * 8):
            x = int(cx + rr * math.cos(ang))
            y = int(base_y - 4 + rr * math.sin(ang) * 0.4)
            if 0 <= x < W and 0 <= y < H:
                d.point((x, y), fill=ACCENT)
    # 基座机房 + 首行日志
    d.rectangle([cx - 34, H - 14, cx + 34, H - 2], outline=BORDER, fill=PANEL)
    d.rectangle([cx - 31, H - 11, cx - 9, H - 8], fill=SUCCESS)
    d.rectangle([cx - 31, H - 6, cx - 20, H - 4], fill=(26, 70, 36))
    # 仰望的人形
    figure(d, cx - 26, H - 26, (4, 6, 9), 1)
    im.save(os.path.join(OUT, "ending-recurrence.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    constrained()
    unconstrained()
    recurrence()
    for name in ("ending-constrained.png", "ending-unconstrained.png", "ending-recurrence.png"):
        print("written:", os.path.join(OUT, name))
