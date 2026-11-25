# plan.json schema

Times are seconds from the start of the source clip. Positions are fractions of the
output frame (x: 0 = left, 1 = right; y: 0 = top, 1 = bottom). Relative paths are
resolved from the folder that holds plan.json.

```jsonc
{
  "source": "/abs/path/raw.mp4",   // set by `plan`
  "width": 1080, "height": 1920, "fps": 30,

  "style": {
    "case": "lower",               // lower | upper | asis
    "hero_color": [255,255,255], "hero_opacity": 0.9,
    "hero_max_size": 0.21,         // hero font size as a fraction of width (shrinks to fit)
    "hero_max_width": 0.88,
    "lead_color": [255,255,255], "lead_size": 0.052,
    "accent_color": [88,182,245], "accent_size": 0.115,
    "prefix_size": 0.07,
    "shadow": 0.45,                // drop-shadow strength 0..1
    "punch_strength": 0.07,        // zoom added by a punch (0.07 = +7%)
    "shake_px": 16                 // shake amplitude at shake = 1
  },

  "beats": [{
    "start": 0.0, "end": 1.04,     // a beat lasts until the next one starts
    "lead":    [{"w": "this", "t": 0.0}],
    "hero":    {"w": "house", "t": 0.18},          // drawn BEHIND the person
    "accents": [{"w": "already", "t": 0.52, "prefix": ""},
                {"w": "home", "t": 6.1, "prefix": "from"}],   // blue, in front
    "hero_x": 0.5, "hero_y": 0.34,                  // centre of the hero word
    "zoom": [1.0, 1.035],          // camera zoom at beat start -> end
    "punch": true,                 // zoom hit when the hero is spoken
    "shake": 0.0                   // 0..1 shake on that hit
  }],

  "cards":  [{"start": 5.2, "end": 7.4, "title": "Work from home", "subtitle": "Study · 12 m²",
              "icon": "🏠",           // emoji (needs Noto Color Emoji) or 1-2 letters
              "x": 0.5, "y": 0.8, "bg": [28,28,32], "icon_bg": [88,182,245]}],

  "photos": [{"start": 2.0, "end": 3.0, "path": "photo.jpg",
              "x": 0.7, "y": 0.62, "w": 0.42, "rot": -6}],

  "broll":  [{"start": 3.4, "end": 3.9, "path": "broll.mp4", "offset": 0.0}],

  "punches": [{"t": 8.2, "zoom": 0.1, "shake": 1}]
}
```

Keys starting with `_` (e.g. `_text`, the phrase the beat came from) are notes for you and
are ignored by the renderer.

Layering, back to front: video (with zoom/shake) → hero word → the person (matte) →
lead words → accent words → cards → photos. During B-roll there is no matte, so the hero
word is drawn on top of the B-roll.
