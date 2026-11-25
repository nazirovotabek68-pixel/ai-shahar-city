#!/usr/bin/env python3
"""dynamic-word-reels: turn a raw talking-head clip into a vertical reel with
big words placed BEHIND the speaker's head, blue accent words, app cards,
photos, B-roll, zoom punches and shakes. Optional "chat mockup" promo frame.

Pipeline (each step writes into a work directory):
  doctor      check dependencies, download the matting model
  transcribe  raw.mp4 -> words.json            (Whisper, word timestamps)
  matte       raw.mp4 -> matte.mkv + matte.json (Robust Video Matting, ONNX)
  plan        words.json + matte.json -> plan.json (auto beats; edit it!)
  preview     plan.json -> preview_*.png        (single frames to check)
  render      plan.json -> reel.mp4
  mockup      reel.mp4 -> promo.mp4             (comment + chat UI frame)
  make        transcribe + matte + plan + render in one go
"""
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.normpath(os.path.join(HERE, "..", "assets", "fonts"))
CACHE = os.path.expanduser("~/.cache/dynamic-word-reels")
RVM_URL = ("https://github.com/PeterL1n/RobustVideoMatting/releases/download/"
           "v1.0.0/rvm_mobilenetv3_fp32.onnx")

FONTS = {
    "hero": "InterDisplay-Bold.otf",
    "lead": "Inter-Medium.otf",
    "accent": "Inter-SemiBold.otf",
    "prefix": "LiberationSerif-Italic.ttf",
    "ui": "Inter-Regular.otf",
    "ui_bold": "Inter-SemiBold.otf",
}

DEFAULT_STYLE = {
    "case": "lower",                 # lower | upper | asis
    "hero_color": [255, 255, 255],
    "hero_opacity": 0.9,
    "hero_max_size": 0.21,           # fraction of width
    "hero_max_width": 0.88,          # fraction of width
    "lead_color": [255, 255, 255],
    "lead_size": 0.052,
    "accent_color": [88, 182, 245],
    "accent_size": 0.115,
    "prefix_size": 0.07,
    "shadow": 0.45,
    "punch_strength": 0.07,
    "shake_px": 16,
}

STOPWORDS = set("""
a an the and or but so to of in on at by for with from into onto as is are was were be been being am
i you he she it we they me him her us them my your his its our their this that these those there here
do does did doing have has had having will would can could should may might must shall not no yes
just very really too also then than if when while where what which who whom whose how why
up down out off over under again once all any both each few more most other some such only own same
let's lets i'm you're it's that's don't can't won't i've you've we're they're
oh um uh like okay ok well yeah
va bu u shu bilan uchun ham endi men sen biz siz ular emas bor yo'q lekin ammo chunki esa da ga ni
bir eng juda yana hali agar qachon qayerda nima kim qanday nega mana ana o'sha
""".split())


# --------------------------------------------------------------------------- utils

def die(msg):
    print("error: " + msg, file=sys.stderr)
    sys.exit(1)


def run(cmd):
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode != 0:
        die("command failed: %s\n%s" % (" ".join(cmd), r.stderr.decode()[-2000:]))
    return r.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path])
    info = json.loads(out)
    v = [s for s in info["streams"] if s["codec_type"] == "video"]
    a = [s for s in info["streams"] if s["codec_type"] == "audio"]
    if not v:
        die("no video stream in " + path)
    num, den = v[0].get("avg_frame_rate", "30/1").split("/")
    fps = float(num) / float(den) if float(den) else 30.0
    return {"duration": float(info["format"].get("duration", 0)), "fps": fps,
            "width": int(v[0]["width"]), "height": int(v[0]["height"]), "audio": bool(a)}


def font(key_or_path, size):
    path = key_or_path
    if not os.path.isfile(path):
        path = os.path.join(FONT_DIR, FONTS.get(key_or_path, key_or_path))
    return ImageFont.truetype(path, max(4, int(size)))


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ease_out_back(p, s=1.6):
    p -= 1
    return 1 + (s + 1) * p ** 3 + s * p ** 2


def ease_out(p):
    return 1 - (1 - p) ** 3


def clean_word(w, case="lower"):
    w = w.strip()
    w = re.sub(r"^[^\w']+|[^\w']+$", "", w, flags=re.UNICODE)
    if case == "lower":
        w = w.lower()
    elif case == "upper":
        w = w.upper()
    return w


def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_json(p, data):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("wrote", p)


class FrameReader:
    """Sequential RGB (or gray) frames from any video, scaled+cropped to WxH."""

    def __init__(self, path, W, H, fps, start=0.0, gray=False):
        self.W, self.H, self.gray = W, H, gray
        self.size = W * H * (1 if gray else 3)
        vf = ("fps=%s,scale=%d:%d:force_original_aspect_ratio=increase,"
              "crop=%d:%d,setsar=1" % (fps, W, H, W, H))
        cmd = ["ffmpeg", "-v", "error"]
        if start > 0:
            cmd += ["-ss", "%.3f" % start]
        cmd += ["-i", path, "-vf", vf, "-f", "rawvideo",
                "-pix_fmt", "gray" if gray else "rgb24", "-"]
        self.p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.last = None

    def read(self):
        buf = self.p.stdout.read(self.size)
        if len(buf) < self.size:
            return self.last  # hold last frame if the stream ran out
        shape = (self.H, self.W) if self.gray else (self.H, self.W, 3)
        self.last = np.frombuffer(buf, np.uint8).reshape(shape)
        return self.last

    def close(self):
        try:
            self.p.stdout.close()
            self.p.kill()
        except Exception:
            pass


def frame_at(path, t, W, H, gray=False):
    r = FrameReader(path, W, H, 30, start=max(0.0, t), gray=gray)
    f = r.read()
    r.close()
    return f


# --------------------------------------------------------------------------- doctor

def ensure_model():
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, "rvm_mobilenetv3_fp32.onnx")
    if not os.path.isfile(p) or os.path.getsize(p) < 1_000_000:
        print("downloading matting model ->", p)
        urllib.request.urlretrieve(RVM_URL, p + ".part")
        os.replace(p + ".part", p)
    return p


def cmd_doctor(a):
    ok = True
    for tool in ("ffmpeg", "ffprobe"):
        print("%-14s %s" % (tool, "ok" if shutil.which(tool) else "MISSING"))
        ok &= bool(shutil.which(tool))
    for mod, pipname in (("numpy", "numpy"), ("PIL", "pillow"), ("cv2", "opencv-python-headless"),
                         ("onnxruntime", "onnxruntime"), ("whisper", "openai-whisper")):
        try:
            __import__(mod)
            print("%-14s ok" % mod)
        except Exception:
            print("%-14s MISSING  (pip install %s)" % (mod, pipname))
            ok = False
    for k, f in FONTS.items():
        if not os.path.isfile(os.path.join(FONT_DIR, f)):
            print("font missing:", f)
            ok = False
    try:
        print("matting model  ok ->", ensure_model())
    except Exception as e:
        print("matting model  FAILED to download:", e)
        ok = False
    print("READY" if ok else "NOT READY")
    sys.exit(0 if ok else 1)


# --------------------------------------------------------------------------- transcribe

def cmd_transcribe(a):
    import whisper
    os.makedirs(a.work, exist_ok=True)
    model = whisper.load_model(a.model)
    kw = {"word_timestamps": True, "verbose": False}
    if a.language:
        kw["language"] = a.language
    if a.prompt:
        kw["initial_prompt"] = a.prompt
    r = model.transcribe(a.input, **kw)
    words = []
    for seg in r["segments"]:
        for w in seg.get("words", []):
            txt = w["word"].strip()
            if txt:
                words.append({"w": txt, "t0": round(w["start"], 3), "t1": round(w["end"], 3)})
    save_json(os.path.join(a.work, "words.json"),
              {"source": os.path.abspath(a.input), "language": r.get("language"),
               "text": r.get("text", "").strip(), "words": words})
    print(r.get("text", "").strip())


# --------------------------------------------------------------------------- matte

def cmd_matte(a):
    import onnxruntime as ort
    os.makedirs(a.work, exist_ok=True)
    info = probe(a.input)
    W, H, fps = a.width // 2, a.height // 2, a.fps
    sess = ort.InferenceSession(ensure_model(), providers=ort.get_available_providers())
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    ds = np.array([a.downsample], np.float32)
    out_path = os.path.join(a.work, "matte.mkv")
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray",
                            "-s", "%dx%d" % (W, H), "-r", str(fps), "-i", "-",
                            "-c:v", "ffv1", out_path], stdin=subprocess.PIPE)
    reader = FrameReader(a.input, W, H, fps)
    n_total = int(math.ceil(info["duration"] * fps))
    stats = []
    for i in range(n_total):
        f = reader.read()
        if f is None:
            break
        src = (f.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
        fgr, pha, *rec = sess.run(None, {"src": src, "r1i": rec[0], "r2i": rec[1],
                                         "r3i": rec[2], "r4i": rec[3], "downsample_ratio": ds})
        al = (np.clip(pha[0, 0], 0, 1) * 255).astype(np.uint8)
        enc.stdin.write(al.tobytes())
        m = al > 128
        rows, cols = np.where(m.any(1))[0], np.where(m.any(0))[0]
        if len(rows) and m.sum() > 0.005 * m.size:
            stats.append([round(rows[0] / H, 4), round(rows[-1] / H, 4),
                          round(cols[0] / W, 4), round(cols[-1] / W, 4)])
        else:
            stats.append(None)
        if i % 30 == 0:
            print("matte %d/%d" % (i, n_total), flush=True)
    reader.close()
    enc.stdin.close()
    enc.wait()
    save_json(os.path.join(a.work, "matte.json"),
              {"fps": fps, "width": W, "height": H, "frames": stats,
               "note": "per frame [top, bottom, left, right] of the person, fractions of the frame"})


# --------------------------------------------------------------------------- plan

def person_box(matte, t0, t1):
    if not matte:
        return None
    fr = matte["frames"]
    i0, i1 = int(t0 * matte["fps"]), int(t1 * matte["fps"]) + 1
    boxes = [b for b in fr[max(0, i0):min(len(fr), i1)] if b]
    if not boxes:
        return None
    return [float(np.median([b[k] for b in boxes])) for k in range(4)]


def auto_hero_pos(box):
    """Centre of the hero word: across the upper head so the head hides part of it."""
    if not box:
        return 0.5, 0.34
    top, bot, left, right = box
    h = bot - top
    # head is ~13% of a standing body, ~35% of a head-and-shoulders shot
    head = clamp(0.13 * h if h > 0.55 else 0.35 * h, 0.05, 0.3)
    y = clamp(top + 0.45 * head, 0.14, 0.6)
    x = clamp((left + right) / 2, 0.38, 0.62)
    return round(x, 3), round(y, 3)


def is_content(w):
    c = clean_word(w, "lower")
    return len(c) >= 3 and c not in STOPWORDS and not c.isdigit()


def is_accent(w):
    return is_content(w) and len(clean_word(w)) >= 4


def split_phrases(words, max_words=6, max_dur=2.4, gap=0.32):
    phrases, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        end = re.search(r"[.!?;:,]$", w["w"].strip())
        pause = nxt is not None and (nxt["t0"] - w["t1"]) > gap
        # never end a phrase on a little word ("from", "its") unless it is far too long
        dangling = clean_word(w["w"]) in STOPWORDS and len(cur) < max_words + 3
        long_ = len(cur) >= max_words or (w["t1"] - cur[0]["t0"]) > max_dur
        if nxt is None or end or pause or (long_ and not dangling):
            phrases.append(cur)
            cur = []
    return phrases


def cmd_plan(a):
    wj = load_json(os.path.join(a.work, "words.json"))
    mpath = os.path.join(a.work, "matte.json")
    matte = load_json(mpath) if os.path.isfile(mpath) else None
    info = probe(wj["source"])
    style = dict(DEFAULT_STYLE)
    words = [w for w in wj["words"] if clean_word(w["w"])]
    beats = []
    for k, ph in enumerate(split_phrases(words, a.max_words)):
        content = [i for i, w in enumerate(ph) if is_content(w["w"])]
        if not content:
            content = [max(range(len(ph)), key=lambda i: len(clean_word(ph[i]["w"])))]
        # hero: first content word in the first 2/3 of the phrase, prefer short punchy ones
        cands = [i for i in content if i <= max(1, int(len(ph) * 0.67))] or content
        short = [i for i in cands if len(clean_word(ph[i]["w"])) <= 8]
        hi = (short or cands)[0]
        after = [i for i, w in enumerate(ph) if i > hi and is_accent(w["w"])]
        after = sorted(sorted(after, key=lambda i: -len(clean_word(ph[i]["w"])))[:2])
        accents = []
        for i in after:
            pre = clean_word(ph[i - 1]["w"]) if i - 1 > hi else ""
            accents.append({"w": clean_word(ph[i]["w"], "asis"), "t": ph[i]["t0"],
                            "prefix": pre if pre in STOPWORDS and i - 1 not in after else ""})
        start = max(0.0, ph[0]["t0"] - 0.06)
        beats.append({
            "start": round(start, 3), "end": None,
            "lead": [{"w": clean_word(w["w"], "asis"), "t": w["t0"]} for w in ph[max(0, hi - 3):hi]],
            "hero": {"w": clean_word(ph[hi]["w"], "asis"), "t": ph[hi]["t0"]},
            "accents": accents,
            "_text": " ".join(w["w"] for w in ph),
        })
    for i, b in enumerate(beats):
        b["end"] = beats[i + 1]["start"] if i + 1 < len(beats) else round(info["duration"], 3)
        x, y = auto_hero_pos(person_box(matte, b["start"], b["end"]))
        b["hero_x"], b["hero_y"] = x, y
        # alternate framing like jump cuts: slow push, then punched-in hold
        b["zoom"] = [1.0, 1.035] if i % 2 == 0 else [1.08, 1.1]
        b["punch"] = True
        b["shake"] = 1.0 if i % 2 else 0.0
    plan = {"source": wj["source"], "width": a.width, "height": a.height, "fps": a.fps,
            "style": style, "beats": beats, "cards": [], "photos": [], "broll": []}
    save_json(os.path.join(a.work, "plan.json"), plan)
    for b in beats:
        print("%6.2f-%6.2f  hero=%-12s accents=%-24s | %s" % (
            b["start"], b["end"], b["hero"]["w"], ",".join(x["w"] for x in b["accents"]), b["_text"]))


# --------------------------------------------------------------------------- sprites

def text_sprite(text, fkey, size, color, opacity=1.0, shadow=0.45, glow=None):
    """Premultiplied RGBA uint8 sprite of `text`; returns (sprite, ink_box) where
    ink_box = (left, top, right, bottom) of the glyphs inside the sprite."""
    f = font(fkey, size)
    l, t, r, b = f.getbbox(text)
    pad = int(size * 0.35)
    w, h = r - l + 2 * pad, b - t + 2 * pad
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((pad - l, pad - t), text, font=f, fill=255)
    out = np.zeros((h, w, 4), np.float32)
    if shadow:
        sh = np.asarray(mask.filter(ImageFilter.GaussianBlur(size * 0.06)), np.float32) / 255
        sh = np.roll(sh, (int(size * 0.03), 0), axis=(0, 1)) * shadow
        out[..., 3] = sh
    if glow:
        gl = np.asarray(mask.filter(ImageFilter.GaussianBlur(size * 0.18)), np.float32) / 255 * glow
        gc = np.array(color, np.float32) / 255
        out[..., :3] = out[..., :3] * (1 - gl[..., None]) + gc * gl[..., None]
        out[..., 3] = out[..., 3] + gl * (1 - out[..., 3])
    m = np.asarray(mask, np.float32) / 255 * opacity
    c = np.array(color, np.float32) / 255
    out[..., :3] = out[..., :3] * (1 - m[..., None]) + c * m[..., None]
    out[..., 3] = out[..., 3] * (1 - m) + m
    img = (np.clip(out, 0, 1) * 255).astype(np.uint8)
    return img, (pad, pad, pad + r - l, pad + b - t)


def over(dst, spr, x, y, op=1.0):
    """Composite premultiplied sprite onto float32 RGB dst at top-left (x, y)."""
    if spr is None or op <= 0:
        return
    H, W = dst.shape[:2]
    h, w = spr.shape[:2]
    x, y = int(round(x)), int(round(y))
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x0 >= x1 or y0 >= y1:
        return
    s = spr[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32) * op
    a = s[..., 3:4] / 255.0
    region = dst[y0:y1, x0:x1]
    region *= (1 - a)
    region += s[..., :3]


def scaled(spr, s):
    import cv2
    if abs(s - 1) < 1e-3:
        return spr
    h, w = spr.shape[:2]
    return cv2.resize(spr, (max(1, int(w * s)), max(1, int(h * s))), interpolation=cv2.INTER_LINEAR)


def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=255)
    return m


def card_sprite(card, W):
    cw, ch = int(W * 0.6), int(W * 0.13)
    pad = int(W * 0.04)
    img = Image.new("RGBA", (cw + 2 * pad, ch + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("L", img.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle([pad, pad + 8, pad + cw, pad + ch + 8], int(ch * 0.28), fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(pad * 0.5))
    img.paste((0, 0, 0, 255), (0, 0), sh)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([pad, pad, pad + cw, pad + ch], int(ch * 0.28),
                        fill=tuple(card.get("bg", [28, 28, 32])) + (235,), outline=(255, 255, 255, 40), width=2)
    # icon
    ic = int(ch * 0.62)
    ix, iy = pad + int(ch * 0.19), pad + (ch - ic) // 2
    d.rounded_rectangle([ix, iy, ix + ic, iy + ic], int(ic * 0.28), fill=tuple(card.get("icon_bg", [88, 182, 245])) + (255,))
    icon = card.get("icon") or (card.get("title", "?")[:1].upper())
    emoji_font = card.get("emoji_font") or "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
    drawn = False
    if any(ord(ch_) > 0x2000 for ch_ in icon) and os.path.isfile(emoji_font):
        try:
            ef = ImageFont.truetype(emoji_font, 109)
            em = Image.new("RGBA", (136, 128), (0, 0, 0, 0))
            ImageDraw.Draw(em).text((0, 0), icon, font=ef, embedded_color=True)
            em = em.crop(em.getbbox() or (0, 0, 136, 128))
            s = int(ic * 0.66)
            em = em.resize((s, int(s * em.height / max(1, em.width))), Image.LANCZOS)
            img.alpha_composite(em, (ix + (ic - em.width) // 2, iy + (ic - em.height) // 2))
            drawn = True
        except Exception:
            drawn = False
    if not drawn:
        f = font("ui_bold", ic * 0.5)
        d.text((ix + ic / 2, iy + ic / 2), icon[:2], font=f, fill=(255, 255, 255, 255), anchor="mm")
    tx = ix + ic + int(ch * 0.18)
    title, sub = card.get("title", ""), card.get("subtitle", "")
    if sub:
        d.text((tx, pad + ch * 0.30), title, font=font("ui_bold", ch * 0.24), fill=(255, 255, 255, 255), anchor="lm")
        d.text((tx, pad + ch * 0.68), sub, font=font("ui", ch * 0.19), fill=(170, 170, 178, 255), anchor="lm")
    else:
        d.text((tx, pad + ch / 2), title, font=font("ui_bold", ch * 0.26), fill=(255, 255, 255, 255), anchor="lm")
    a = np.asarray(img, np.float32)
    a[..., :3] *= a[..., 3:4] / 255
    return a.astype(np.uint8)


def photo_sprite(ph, W, base_dir):
    path = ph["path"]
    if not os.path.isabs(path):
        path = os.path.join(base_dir, path)
    im = Image.open(path).convert("RGB")
    w = int(W * ph.get("w", 0.45))
    h = int(w * im.height / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    b = int(W * 0.012)
    card = Image.new("RGBA", (w + 2 * b, h + 2 * b), (255, 255, 255, 255))
    card.paste(im, (b, b))
    card.putalpha(rounded_mask(card.width, card.height, int(W * 0.02)))
    pad = int(W * 0.05)
    img = Image.new("RGBA", (card.width + 2 * pad, card.height + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("L", img.size, 0)
    sh.paste(card.split()[3].point(lambda v: v * 0.6), (pad, pad + 10))
    img.paste((0, 0, 0, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(pad * 0.4)))
    img.alpha_composite(card, (pad, pad))
    img = img.rotate(ph.get("rot", -5), resample=Image.BICUBIC, expand=True)
    a = np.asarray(img, np.float32)
    a[..., :3] *= a[..., 3:4] / 255
    return a.astype(np.uint8)


# --------------------------------------------------------------------------- render

class Renderer:
    def __init__(self, plan, plan_dir):
        self.p = plan
        self.dir = plan_dir
        self.W, self.H, self.fps = plan["width"], plan["height"], plan["fps"]
        self.st = dict(DEFAULT_STYLE, **plan.get("style", {}))
        self.cache = {}
        self.punches = []
        for b in plan["beats"]:
            if b.get("punch", True) and b.get("hero"):
                self.punches.append((b["hero"]["t"], self.st["punch_strength"], b.get("shake", 0)))
        for pu in plan.get("punches", []):
            self.punches.append((pu["t"], pu.get("zoom", self.st["punch_strength"]), pu.get("shake", 1)))

    def word(self, w):
        return clean_word(w, self.st["case"]) if self.st["case"] != "asis" else w

    def spr(self, key, *args, **kw):
        k = (key,) + args + tuple(sorted(kw.items()))
        if k not in self.cache:
            self.cache[k] = text_sprite(*args, **kw)
        return self.cache[k]

    def beat_at(self, t):
        for b in self.p["beats"]:
            if b["start"] <= t < b["end"]:
                return b
        return None

    def camera(self, t):
        b = self.beat_at(t)
        z = 1.0
        if b:
            z0, z1 = b.get("zoom", [1.0, 1.0])
            z = z0 + (z1 - z0) * clamp((t - b["start"]) / max(0.01, b["end"] - b["start"]))
        punch, dx, dy = 0.0, 0.0, 0.0
        for tp, k, shake in self.punches:
            d = t - tp
            if 0 <= d < 0.6:
                env = math.exp(-d / 0.18) * min(1.0, d / 0.04)
                punch += k * env
                if shake:
                    amp = self.st["shake_px"] * shake * math.exp(-d / 0.16)
                    dx += amp * math.sin(d * 97.0 + tp * 13)
                    dy += amp * 0.7 * math.cos(d * 83.0 + tp * 7)
        z *= 1 + punch
        cx, cy = self.W / 2, self.H * 0.42
        return np.float32([[z, 0, (1 - z) * cx + dx], [0, z, (1 - z) * cy + dy]])

    def layers(self, t):
        """Return (behind, front) lists of (sprite, x, y, opacity)."""
        W, H, st = self.W, self.H, self.st
        behind, front = [], []
        b = self.beat_at(t)
        if b and b.get("hero"):
            fade_out = clamp((b["end"] - t) / 0.08)
            hx, hy = b.get("hero_x", 0.5) * W, b.get("hero_y", 0.34) * H
            # hero (behind the head)
            hw = self.word(b["hero"]["w"])
            size = st["hero_max_size"] * W
            f = font("hero", size)
            tw = f.getlength(hw)
            if tw > st["hero_max_width"] * W:
                size *= st["hero_max_width"] * W / tw
            size = int(size)
            spr, ink = self.spr("hero", hw, "hero", size, tuple(st["hero_color"]),
                                opacity=st["hero_opacity"], shadow=st["shadow"])
            ink_w, ink_h = ink[2] - ink[0], ink[3] - ink[1]
            hx = clamp(hx, 0.05 * W + ink_w / 2, max(0.05 * W + ink_w / 2, 0.95 * W - ink_w / 2))
            ink_left, ink_top = hx - ink_w / 2, hy - ink_h / 2
            ink_bot = hy + ink_h / 2
            p = clamp((t - b["hero"]["t"]) / 0.2)
            if p > 0:
                s = 0.8 + 0.2 * ease_out_back(p)
                sp = scaled(spr, s)
                behind.append((sp, hx - sp.shape[1] / 2, hy - sp.shape[0] / 2,
                               clamp(p * 2.5) * fade_out))
            # lead words (small, in front, typed as spoken)
            lead = [w for w in b.get("lead", []) if w["t"] <= t]
            if lead:
                txt = " ".join(self.word(w["w"]) for w in lead)
                ls, lk = self.spr("lead", txt, "lead", int(st["lead_size"] * W), tuple(st["lead_color"]),
                                  shadow=st["shadow"])
                lx = clamp(ink_left + W * 0.015, 0.05 * W, max(0.05 * W, 0.95 * W - (lk[2] - lk[0])))
                front.append((ls, lx - lk[0], ink_top - (lk[3] - lk[1]) - H * 0.008 - lk[1],
                              fade_out))
            # accents (blue, in front, one at a time)
            acc = [x for x in b.get("accents", []) if x["t"] <= t]
            if acc:
                x = acc[-1]
                pa = clamp((t - x["t"]) / 0.18)
                aw = self.word(x["w"])
                asz = int(st["accent_size"] * W)
                fa = font("accent", asz)
                if fa.getlength(aw) > 0.9 * W:
                    asz = int(asz * 0.9 * W / fa.getlength(aw))
                aspr, ak = self.spr("acc", aw, "accent", asz, tuple(st["accent_color"]),
                                    shadow=st["shadow"] * 0.8, glow=0.35)
                ay = ink_bot + H * 0.012
                if x.get("prefix"):
                    pspr, pk = self.spr("pre", self.word(x["prefix"]), "prefix", int(st["prefix_size"] * W),
                                        (255, 255, 255), shadow=st["shadow"])
                    a_left = hx - (ak[2] - ak[0]) / 2
                    front.append((pspr, a_left + W * 0.03 - pk[0], ay - pk[1], fade_out * clamp(pa * 3)))
                    ay += (pk[3] - pk[1]) * 0.85
                s = 0.85 + 0.15 * ease_out_back(pa)
                sp = scaled(aspr, s)
                lift = (1 - ease_out(pa)) * H * 0.02
                front.append((sp, hx - sp.shape[1] / 2, ay - ak[1] * s + lift, fade_out * clamp(pa * 3)))
        # cards
        for c in self.p.get("cards", []):
            if c["start"] <= t < c["end"]:
                k = ("card", json.dumps(c, sort_keys=True))
                if k not in self.cache:
                    self.cache[k] = card_sprite(c, W)
                sp = self.cache[k]
                pin = ease_out(clamp((t - c["start"]) / 0.25))
                pout = clamp((c["end"] - t) / 0.15)
                y = c.get("y", 0.8) * H + (1 - pin) * H * 0.04
                front.append((sp, c.get("x", 0.5) * W - sp.shape[1] / 2, y - sp.shape[0] / 2, pin * pout))
        # photos
        for ph in self.p.get("photos", []):
            if ph["start"] <= t < ph["end"]:
                k = ("photo", json.dumps(ph, sort_keys=True))
                if k not in self.cache:
                    self.cache[k] = photo_sprite(ph, W, self.dir)
                pin = clamp((t - ph["start"]) / 0.22)
                pout = clamp((ph["end"] - t) / 0.12)
                sp = scaled(self.cache[k], 0.7 + 0.3 * ease_out_back(pin))
                front.append((sp, ph.get("x", 0.5) * W - sp.shape[1] / 2,
                              ph.get("y", 0.3) * H - sp.shape[0] / 2, clamp(pin * 2) * pout))
        return behind, front

    def compose(self, frame, alpha, t, broll_frame=None):
        import cv2
        M = self.camera(t)
        src = broll_frame if broll_frame is not None else frame
        f = cv2.warpAffine(src, M, (self.W, self.H), flags=cv2.INTER_LINEAR,
                           borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        behind, front = self.layers(t)
        if broll_frame is None and alpha is not None:
            al = cv2.resize(alpha, (self.W, self.H), interpolation=cv2.INTER_LINEAR)
            al = cv2.warpAffine(al, M, (self.W, self.H), flags=cv2.INTER_LINEAR,
                                borderMode=cv2.BORDER_REFLECT)
            al = cv2.GaussianBlur(al, (0, 0), 1.2).astype(np.float32)[..., None] / 255.0
            bg = f.copy()
            for s, x, y, op in behind:
                over(bg, s, x, y, op)
            out = f * al + bg * (1 - al)
        else:
            out = f
            for s, x, y, op in behind:
                over(out, s, x, y, op)
        for s, x, y, op in front:
            over(out, s, x, y, op)
        return np.clip(out, 0, 255).astype(np.uint8)


def resolve(path, base):
    return path if os.path.isabs(path) else os.path.normpath(os.path.join(base, path))


def cmd_render(a):
    plan = load_json(a.plan)
    base = os.path.dirname(os.path.abspath(a.plan))
    R = Renderer(plan, base)
    W, H, fps = R.W, R.H, R.fps
    src = plan["source"]
    info = probe(src)
    dur = a.duration or info["duration"]
    n = int(round(dur * fps))
    matte_path = os.path.join(base, "matte.mkv")
    mj = os.path.join(base, "matte.json")
    reader = FrameReader(src, W, H, fps)
    mreader = None
    if os.path.isfile(matte_path) and os.path.isfile(mj):
        m = load_json(mj)
        mreader = FrameReader(matte_path, m["width"], m["height"], fps, gray=True)
    else:
        print("warning: no matte.mkv; words will sit in front of the speaker")
    out = a.out or os.path.join(base, "reel.mp4")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (W, H),
           "-r", str(fps), "-i", "-"]
    if info["audio"]:
        cmd += ["-i", src, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", out]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    brolls = sorted(plan.get("broll", []), key=lambda x: x["start"])
    active = None
    for i in range(n):
        t = i / fps
        fr = reader.read()
        al = mreader.read() if mreader else None
        if fr is None:
            break
        bf = None
        if active and t >= active[0]["end"]:
            active[1].close()
            active = None
        if active is None:
            for br in brolls:
                if br["start"] <= t < br["end"]:
                    active = (br, FrameReader(resolve(br["path"], base), W, H, fps,
                                              start=br.get("offset", 0) + (t - br["start"])))
                    brolls = [x for x in brolls if x is not br]
                    break
        if active:
            bf = active[1].read()
        enc.stdin.write(R.compose(fr, al, t, bf).tobytes())
        if i % 30 == 0:
            print("render %d/%d" % (i, n), flush=True)
    enc.stdin.close()
    enc.wait()
    reader.close()
    if mreader:
        mreader.close()
    print("wrote", out)


def cmd_preview(a):
    plan = load_json(a.plan)
    base = os.path.dirname(os.path.abspath(a.plan))
    R = Renderer(plan, base)
    W, H = R.W, R.H
    times = [float(x) for x in a.times.split(",")] if a.times else \
        [round(b["hero"]["t"] + 0.35, 2) for b in plan["beats"] if b.get("hero")]
    m = load_json(os.path.join(base, "matte.json")) if os.path.isfile(os.path.join(base, "matte.json")) else None
    imgs = []
    for t in times:
        fr = frame_at(plan["source"], t, W, H)
        al = frame_at(os.path.join(base, "matte.mkv"), t, m["width"], m["height"], gray=True) if m else None
        bf = None
        for br in plan.get("broll", []):
            if br["start"] <= t < br["end"]:
                bf = frame_at(resolve(br["path"], base), br.get("offset", 0) + t - br["start"], W, H)
        img = Image.fromarray(R.compose(fr, al, t, bf))
        ImageDraw.Draw(img).text((20, 20), "%.2fs" % t, font=font("ui_bold", 40), fill=(255, 60, 60))
        imgs.append(img)
    # contact sheet
    cols = min(len(imgs), a.cols)
    rows = int(math.ceil(len(imgs) / cols))
    tw, th = W // 3, H // 3
    sheet = Image.new("RGB", (cols * tw, rows * th), (0, 0, 0))
    for k, im in enumerate(imgs):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), ((k % cols) * tw, (k // cols) * th))
    out = a.out or os.path.join(base, "preview.jpg")
    sheet.save(out, quality=88)
    print("wrote", out, "(times: %s)" % ", ".join("%.2f" % t for t in times))


def cmd_make(a):
    os.makedirs(a.work, exist_ok=True)
    cmd_transcribe(argparse.Namespace(input=a.input, work=a.work, model=a.model, language=a.language, prompt=None))
    cmd_matte(argparse.Namespace(input=a.input, work=a.work, width=a.width, height=a.height, fps=a.fps,
                                 downsample=0.4))
    cmd_plan(argparse.Namespace(work=a.work, width=a.width, height=a.height, fps=a.fps, max_words=6))
    cmd_render(argparse.Namespace(plan=os.path.join(a.work, "plan.json"), out=None, crf=18, duration=None))


# --------------------------------------------------------------------------- mockup

def stripes_background(W, H, seed=7):
    rng = np.random.default_rng(seed)
    x = np.arange(W, dtype=np.float32)
    v = np.zeros(W, np.float32)
    pos = 0.0
    while pos < W:  # pleated curtain: folds of random width
        wdt = rng.uniform(W * 0.025, W * 0.07)
        seg = (x >= pos) & (x < pos + wdt)
        u = (x[seg] - pos) / wdt
        v[seg] = (np.sin(u * math.pi) ** 2) * rng.uniform(0.35, 1.0)
        pos += wdt
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    streak = np.exp(-(((xx - W * 0.85) + (yy - H * 0.5) * 0.55) / (W * 0.18)) ** 2)
    streak2 = np.exp(-(((xx - W * 0.1) - (yy - H * 0.9) * 0.6) / (W * 0.12)) ** 2) * 0.6
    vign = 1 - 0.55 * (((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2) * 2.2
    lum = (0.18 + 0.55 * v[None, :]) * (0.55 + 0.9 * (streak + streak2)) * vign
    base = np.array([60, 78, 102], np.float32)
    img = np.clip(lum[..., None] * base[None, None] * 1.4 + 8, 0, 255).astype(np.uint8)
    return Image.fromarray(img).filter(ImageFilter.GaussianBlur(1.2)).convert("RGBA")


def spark(d, cx, cy, r, color=(217, 119, 87, 255)):
    for k in range(8):
        ang = k * math.pi / 4 + 0.2
        rr = r if k % 2 == 0 else r * 0.72
        d.line([(cx, cy), (cx + rr * math.cos(ang), cy + rr * math.sin(ang))], fill=color, width=max(3, int(r * 0.32)))


def cmd_mockup(a):
    W, H = 1080, 1920
    rinfo = probe(a.reel)
    img = stripes_background(W, H)
    d = ImageDraw.Draw(img)
    F = lambda k, s: font(k, s)
    # comment card
    d.rounded_rectangle([160, 270, 920, 408], 24, fill=(20, 21, 24, 255), outline=(78, 80, 88, 255), width=2)
    d.ellipse([186, 300, 238, 352], fill=(110, 112, 120, 255))
    d.ellipse([202, 310, 222, 330], fill=(170, 172, 180, 255))
    d.pieslice([194, 328, 230, 368], 180, 360, fill=(170, 172, 180, 255))
    d.text((258, 296), a.user, font=F("ui_bold", 24), fill=(255, 255, 255))
    d.text((258 + F("ui_bold", 24).getlength(a.user) + 10, 297), "· " + a.ago, font=F("ui", 23), fill=(140, 140, 148))
    d.text((258, 328), a.comment, font=F("ui", 33), fill=(255, 255, 255))
    d.text((258, 372), "Reply", font=F("ui_bold", 20), fill=(140, 140, 148))
    hx, hy = 882, 334  # heart outline
    pts = []
    for k in range(64):
        u = k / 64 * 2 * math.pi
        pts.append((hx + 0.95 * 16 * math.sin(u) ** 3,
                    hy - 0.95 * (13 * math.cos(u) - 5 * math.cos(2 * u) - 2 * math.cos(3 * u) - math.cos(4 * u))))
    d.line(pts + [pts[0]], fill=(220, 220, 225), width=3, joint="curve")
    # main card
    top, bot = 440, 1680
    d.rounded_rectangle([96, top, 984, bot], 34, fill=(22, 22, 25, 255), outline=(58, 58, 64, 255), width=2)
    spark(d, 146, top + 58, 20)
    d.text((182, top + 58), a.title, font=F("ui_bold", 36), fill=(255, 255, 255), anchor="lm")
    d.text((196 + F("ui_bold", 36).getlength(a.title), top + 60), a.subtitle, font=F("ui", 26),
           fill=(140, 140, 148), anchor="lm")
    d.line([(98, top + 112), (982, top + 112)], fill=(44, 44, 50, 255), width=2)
    # user bubble with raw thumbnail
    bx0, by0, bx1, by1 = 380, top + 140, 950, top + 365
    d.rounded_rectangle([bx0, by0, bx1, by1], 24, fill=(38, 38, 42, 255))
    raw = a.raw or a.reel
    tw, th = 128, 190
    thumb = Image.fromarray(frame_at(raw, min(1.0, probe(raw)["duration"] / 3), tw, th)).convert("RGBA")
    thumb.putalpha(rounded_mask(tw, th, 14))
    img.alpha_composite(thumb, (bx0 + 18, by0 + 18))
    rdur = probe(raw)["duration"]
    tx = bx0 + 18 + tw + 22
    name = os.path.basename(raw)
    d.text((tx, by0 + 26), name, font=F("ui_bold", 25), fill=(255, 255, 255))
    d.text((tx + F("ui_bold", 25).getlength(name) + 8, by0 + 27), "· %d s" % round(rdur), font=F("ui", 23),
           fill=(140, 140, 148))
    cw = F("ui", 23).getlength(a.skill) + 30
    d.rounded_rectangle([tx, by0 + 68, tx + cw, by0 + 108], 10, fill=(88, 40, 34, 255))
    d.text((tx + 15, by0 + 88), a.skill, font=F("ui", 23), fill=(240, 150, 128), anchor="lm")
    d.text((tx, by0 + 132), a.prompt, font=F("ui", 29), fill=(240, 240, 244))
    # answer
    ay = by1 + 52
    spark(d, 146, ay, 16)
    d.text((176, ay), a.answer, font=F("ui", 33), fill=(255, 255, 255), anchor="lm")
    # reel slot + right column
    rx, ry, rw = 136, ay + 52, 440
    rh = int(rw * 16 / 9)
    if ry + rh > bot - 30:
        rh = bot - 30 - ry
        rw = int(rh * 9 / 16)
    cx0 = rx + rw + 30
    rname = os.path.basename(a.reel)
    d.text((cx0, ry + 4), rname, font=F("ui_bold", 32), fill=(255, 255, 255))
    d.text((cx0, ry + 48), "%dx%d · %d s" % (rinfo["width"], rinfo["height"], round(rinfo["duration"])),
           font=F("ui", 23), fill=(140, 140, 148))
    yy = ry + 100
    for item in [x.strip() for x in a.checks.split(",") if x.strip()]:
        d.rounded_rectangle([cx0, yy, 950, yy + 52], 12, fill=(40, 40, 45, 255))
        d.text((cx0 + 18, yy + 26), "✓  " + item, font=F("ui", 25), fill=(235, 235, 240), anchor="lm")
        yy += 64
    dy = ry + rh - 58
    d.rounded_rectangle([cx0, dy, 950, dy + 58], 12, fill=(245, 245, 247, 255))
    d.text(((cx0 + 950) / 2, dy + 29), "↓  Download", font=F("ui_bold", 26), fill=(20, 20, 22), anchor="mm")
    work = os.path.dirname(os.path.abspath(a.out))
    bgp = os.path.join(work, "_mockup_bg.png")
    mkp = os.path.join(work, "_mockup_mask.png")
    img.convert("RGB").save(bgp)
    rounded_mask(rw, rh, 22).save(mkp)
    fc = ("[1:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,setsar=1,format=rgba[r];"
          "[2:v]format=gray[m];[r][m]alphamerge[rr];[0:v][rr]overlay=%d:%d:shortest=1,format=yuv420p[v]"
          % (rw, rh, rw, rh, rx, ry))
    cmd = ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "30", "-i", bgp, "-i", a.reel,
           "-loop", "1", "-i", mkp, "-filter_complex", fc, "-map", "[v]"]
    if rinfo["audio"]:
        cmd += ["-map", "1:a", "-c:a", "aac", "-b:a", "192k"]
    cmd += ["-c:v", "libx264", "-crf", "18", "-r", "30", "-t", "%.3f" % rinfo["duration"],
            "-movflags", "+faststart", a.out]
    run(cmd)
    os.remove(bgp)
    os.remove(mkp)
    print("wrote", a.out)


# --------------------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)

    def size_args(p):
        p.add_argument("--width", type=int, default=1080)
        p.add_argument("--height", type=int, default=1920)
        p.add_argument("--fps", type=int, default=30)

    p = sp.add_parser("doctor")
    p.set_defaults(fn=cmd_doctor)

    p = sp.add_parser("transcribe")
    p.add_argument("input")
    p.add_argument("--work", required=True)
    p.add_argument("--model", default="small", help="whisper model: tiny/base/small/medium/large-v3")
    p.add_argument("--language", default=None, help="e.g. en, uz, ru (auto if omitted)")
    p.add_argument("--prompt", default=None, help="spelling hints (names, brands)")
    p.set_defaults(fn=cmd_transcribe)

    p = sp.add_parser("matte")
    p.add_argument("input")
    p.add_argument("--work", required=True)
    p.add_argument("--downsample", type=float, default=0.4)
    size_args(p)
    p.set_defaults(fn=cmd_matte)

    p = sp.add_parser("plan")
    p.add_argument("--work", required=True)
    p.add_argument("--max-words", type=int, default=6)
    size_args(p)
    p.set_defaults(fn=cmd_plan)

    p = sp.add_parser("preview")
    p.add_argument("plan")
    p.add_argument("--times", default=None, help="comma separated seconds; default: each hero word")
    p.add_argument("--cols", type=int, default=5)
    p.add_argument("--out", default=None)
    p.set_defaults(fn=cmd_preview)

    p = sp.add_parser("render")
    p.add_argument("plan")
    p.add_argument("--out", default=None)
    p.add_argument("--crf", type=int, default=18)
    p.add_argument("--duration", type=float, default=None)
    p.set_defaults(fn=cmd_render)

    p = sp.add_parser("make")
    p.add_argument("input")
    p.add_argument("--work", required=True)
    p.add_argument("--model", default="small")
    p.add_argument("--language", default=None)
    size_args(p)
    p.set_defaults(fn=cmd_make)

    p = sp.add_parser("mockup")
    p.add_argument("reel")
    p.add_argument("--raw", default=None, help="raw clip shown as the user's upload (default: the reel)")
    p.add_argument("--out", required=True)
    p.add_argument("--comment", default="AI edits are pure crap.")
    p.add_argument("--user", default="follower")
    p.add_argument("--ago", default="2h")
    p.add_argument("--title", default="Claude")
    p.add_argument("--subtitle", default="Edit my reel")
    p.add_argument("--skill", default="dynamic-word-reels")
    p.add_argument("--prompt", default="Edit my raw clip with my skill.")
    p.add_argument("--answer", default="Here is your reel ✓")
    p.add_argument("--checks", default="Words behind the head,App cards,Photos,B-roll + shakes,Zoom + shakes")
    p.set_defaults(fn=cmd_mockup)

    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
