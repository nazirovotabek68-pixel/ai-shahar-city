---
name: dynamic-word-reels
description: Edit a raw talking-head clip into a vertical 1080x1920 reel with big words placed BEHIND the speaker's head (person matting), small lead-in words, blue accent words, app-style cards, photo pop-ups, B-roll cutaways, zoom punches and camera shakes, plus an optional promo frame that shows the reel inside a comment + chat UI mockup. Use when the user gives a talking-head / vlog / real-estate / UGC video and asks for "words behind head", "text behind person", "dynamic word reel", "edit my raw clip with my skill", "reel like this", or in Uzbek "so'zlar boshning orqasida", "reels qilib ber", "videoni montaj qil", "shu uslubda reel".
---

# Dynamic Word Reels

Raw clip → reel where each phrase gets one **big hero word behind the head**, the
words before it typed small above, and the key word after it popping in **blue**
in front of the body. Cards, photos and B-roll are added by you (Claude) from what
the speaker says. The automation does the heavy lifting; your taste decides the words.

All commands: `python3 <skill_dir>/scripts/dwr.py <command> ...`
(`<skill_dir>` = the folder holding this file). Work in one folder per video (`--work`).

## 0. Check the machine (once)

```bash
python3 scripts/dwr.py doctor
```
Missing modules: `pip install -r requirements.txt`. Needs ffmpeg/ffprobe. The first run
downloads the Robust Video Matting model (15 MB, GitHub release) into
`~/.cache/dynamic-word-reels/`. Whisper downloads its own model on first use.

## 1. Transcribe

```bash
python3 scripts/dwr.py transcribe raw.mp4 --work W --model small --language en
```
Writes `W/words.json` (`{"w","t0","t1"}` per word). **Read the text and fix wrong
words in words.json** (names, brands, slang). Uzbek/Russian: pass `--language uz` / `ru`
and `--model medium` or larger; check carefully, Whisper is weaker there. Keep timings.

## 2. Matte the speaker

```bash
python3 scripts/dwr.py matte raw.mp4 --work W
```
Writes `W/matte.mkv` (alpha video, half resolution) and `W/matte.json` (person box per
frame). ~1.5x real time on 4 CPU cores. The clip is centre-cropped to 9:16.

## 3. Auto plan, then curate it (this is the important step)

```bash
python3 scripts/dwr.py plan --work W
```
Prints one line per beat (phrase) and writes `W/plan.json`. Then edit `plan.json`:

- **hero**: one short, punchy word per beat (≤ 8 letters reads best): the noun or verb
  the line is about. Prefer the word that carries the joke or the point.
- **lead**: 1–3 words spoken right before the hero (small, typed as spoken). Can be `[]`.
- **accents**: 0–2 blue words after the hero, each with its own time `t`. `prefix` is an
  optional little word drawn in serif italic above it ("from" → **home**).
- **hero_y / hero_x**: centre of the hero word as a fraction of the frame. Auto-placed
  across the upper head; move it if the preview shows the word fully hidden or not
  touching the head at all. The head should cover 1–2 letters.
- **zoom** `[start, end]` per beat; alternating push-in and punched-in framing
  mimics jump cuts. **punch** (bool) = zoom hit on the hero word; **shake** 0–1.
- **cards**: app-style notification cards that restate a phrase, e.g.
  `{"start":5.2,"end":7.4,"title":"Work from home","subtitle":"Study · 12 m²","icon":"🏠"}`.
  1 card every 3–5 s at most.
- **photos**: pop-up photos `{"start","end","path","x","y","w","rot"}`. Use the user's
  images or stills grabbed from the clip (`ffmpeg -ss T -i raw.mp4 -frames:v 1 W/p.jpg`).
- **broll**: cutaways `{"start","end","path","offset"}` (video replaces the speaker, audio
  stays). Keep them 0.4–1.5 s, on the words they illustrate.
- **punches** (optional, top level): extra hits `{"t", "zoom":0.07, "shake":1}`.
- **style**: colours/sizes; see `references/plan-schema.md`.

Full schema with defaults: `references/plan-schema.md`. Paths are relative to `W`.

## 4. Look before rendering

```bash
python3 scripts/dwr.py preview W/plan.json            # one frame per hero word
python3 scripts/dwr.py preview W/plan.json --times 1.2,4.8
```
Open `W/preview.jpg` and check: hero word visibly **behind** the head (head occludes part
of it), nothing important cut off at the edges, accents not covering the face, cards
not on the face. Fix plan.json and preview again.

## 5. Render

```bash
python3 scripts/dwr.py render W/plan.json            # -> W/reel.mp4 (1080x1920, 30 fps, original audio)
```
About 3x real time on 4 cores. Grab 3–4 frames of the output and look at them before
handing it over.

## 6. Optional: promo frame ("AI edits are crap" → chat → result)

```bash
python3 scripts/dwr.py mockup W/reel.mp4 --raw raw.mp4 --out W/promo.mp4 \
  --comment "AI edits are pure crap." --title "Claude" --subtitle "Edit my reel" \
  --checks "Words behind her head,App cards,Photos,B-roll + shakes,Zoom + shakes"
```
Dark curtain background, comment card on top, chat card with the raw upload, the skill
chip, the prompt, and the reel playing beside a checklist and a Download button.
Every label is a flag (`--user --ago --skill --prompt --answer`), so it can be in Uzbek.

## Shortcut

`python3 scripts/dwr.py make raw.mp4 --work W --language en` runs steps 1–3 and 5 with
the automatic plan. Use it only for a quick draft; the curated plan is what makes it good.

## Good taste rules

- One idea per beat, one hero per beat. Never two big words at once.
- The hero appears exactly when it is spoken; leads and accents also follow speech timing.
- Text behind the head only works if the head is in the upper half: for wide shots
  where the person is tiny, raise `style.hero_max_size` and put `hero_y` at the head.
- 9:16 safe area: keep text between 12% and 80% of the height, away from the right edge
  (platform buttons) and the bottom 18% (caption bar).
- Shakes are seasoning: on punchlines and cuts, not on every beat.
