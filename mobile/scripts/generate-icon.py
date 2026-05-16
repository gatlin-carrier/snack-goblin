#!/usr/bin/env python3
"""Generate Snack Goblin app icons from the goblin SVG design."""

import cairosvg
import os

# Brand colors (matching shared/tokens.js + Goblin.jsx)
BG      = '#FAF0E6'   # goblin-bg warm cream
SKIN    = '#8DB87A'
INK     = '#2D1F14'
CHEEK   = '#D4703A'
HAT     = '#F0EDE6'
HAT_LINE = '#A89070'
FOLD    = '#BFAD95'
HORN_LINE = '#5A8247'
WHITE   = '#FFFFFF'

def goblin_svg(size):
    s = size
    cx = s / 2
    cy = s * 0.62
    r  = s * 0.32

    brimY = cy - r + s * 0.02

    # viewBox with top padding for the hat
    vb_top   = -s * 0.12
    vb_h     = s * 1.12

    # Dome cubic bezier path
    dome = (
        f"M {cx - s*0.18} {brimY} "
        f"C {cx - s*0.28} {brimY - s*0.05} "
        f"  {cx - s*0.28} {brimY - s*0.17} "
        f"  {cx - s*0.17} {brimY - s*0.25} "
        f"C {cx - s*0.10} {brimY - s*0.31} "
        f"  {cx + s*0.10} {brimY - s*0.31} "
        f"  {cx + s*0.17} {brimY - s*0.25} "
        f"C {cx + s*0.28} {brimY - s*0.17} "
        f"  {cx + s*0.28} {brimY - s*0.05} "
        f"  {cx + s*0.18} {brimY} Z"
    )

    sw = s * 0.018   # hat stroke width

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg"
     width="{s}" height="{vb_h}"
     viewBox="0 {vb_top} {s} {vb_h}">

  <!-- Background -->
  <rect x="0" y="{vb_top}" width="{s}" height="{vb_h}" fill="{BG}"/>

  <!-- Ears (behind head) -->
  <path d="M {cx-r+s*0.01} {cy+s*0.04} Q {cx-r-s*0.08} {cy+s*0.05} {cx-r-s*0.14} {cy-s*0.07} Q {cx-r-s*0.08} {cy-s*0.12} {cx-r+s*0.01} {cy-s*0.06} Z" fill="{SKIN}"/>
  <path d="M {cx+r-s*0.01} {cy+s*0.04} Q {cx+r+s*0.08} {cy+s*0.05} {cx+r+s*0.14} {cy-s*0.07} Q {cx+r+s*0.08} {cy-s*0.12} {cx+r-s*0.01} {cy-s*0.06} Z" fill="{SKIN}"/>
  <!-- Ear cartilage -->
  <path d="M {cx-r-s*0.01} {cy+s*0.01} Q {cx-r-s*0.07} {cy-s*0.03} {cx-r-s*0.10} {cy-s*0.06}" stroke="{CHEEK}" stroke-width="{s*0.013}" fill="none" opacity="0.35" stroke-linecap="round"/>
  <path d="M {cx+r+s*0.01} {cy+s*0.01} Q {cx+r+s*0.07} {cy-s*0.03} {cx+r+s*0.10} {cy-s*0.06}" stroke="{CHEEK}" stroke-width="{s*0.013}" fill="none" opacity="0.35" stroke-linecap="round"/>

  <!-- Head -->
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="{SKIN}"/>

  <!-- Cheeks -->
  <ellipse cx="{cx - s*0.19}" cy="{cy - s*0.01}" rx="{s*0.065}" ry="{s*0.040}" fill="{CHEEK}" opacity="0.30"/>
  <ellipse cx="{cx + s*0.19}" cy="{cy - s*0.01}" rx="{s*0.065}" ry="{s*0.040}" fill="{CHEEK}" opacity="0.30"/>

  <!-- Chef hat: dome -->
  <path d="{dome}" fill="{WHITE}" stroke="{HAT_LINE}" stroke-width="{sw}"/>
  <!-- Fold lines -->
  <path d="M {cx - s*0.08} {brimY - s*0.03} Q {cx - s*0.074} {brimY - s*0.15} {cx - s*0.08} {brimY - s*0.27}" stroke="{FOLD}" stroke-width="{s*0.010}" fill="none" opacity="0.45" stroke-linecap="round"/>
  <path d="M {cx + s*0.08} {brimY - s*0.03} Q {cx + s*0.074} {brimY - s*0.15} {cx + s*0.08} {brimY - s*0.27}" stroke="{FOLD}" stroke-width="{s*0.010}" fill="none" opacity="0.45" stroke-linecap="round"/>
  <!-- Brim -->
  <rect x="{cx - s*0.22}" y="{brimY}" width="{s*0.44}" height="{s*0.09}" rx="{s*0.03}" fill="{HAT}" stroke="{HAT_LINE}" stroke-width="{sw}"/>
  <!-- Horns -->
  <path d="M {cx-s*0.17} {brimY+s*0.12} Q {cx-s*0.13} {brimY+s*0.04} {cx-s*0.20} {brimY-s*0.10} Q {cx-s*0.27} {brimY+s*0.03} {cx-s*0.24} {brimY+s*0.12} Q {cx-s*0.205} {brimY+s*0.17} {cx-s*0.17} {brimY+s*0.12} Z" fill="{SKIN}" stroke="{HORN_LINE}" stroke-width="{s*0.015}" stroke-linejoin="round"/>
  <path d="M {cx+s*0.24} {brimY+s*0.12} Q {cx+s*0.27} {brimY+s*0.03} {cx+s*0.20} {brimY-s*0.10} Q {cx+s*0.13} {brimY+s*0.04} {cx+s*0.17} {brimY+s*0.12} Q {cx+s*0.205} {brimY+s*0.17} {cx+s*0.24} {brimY+s*0.12} Z" fill="{SKIN}" stroke="{HORN_LINE}" stroke-width="{s*0.015}" stroke-linejoin="round"/>

  <!-- Eyes -->
  <ellipse cx="{cx - s*0.10}" cy="{cy - s*0.04}" rx="{s*0.035}" ry="{s*0.042}" fill="{INK}"/>
  <ellipse cx="{cx + s*0.10}" cy="{cy - s*0.04}" rx="{s*0.035}" ry="{s*0.042}" fill="{INK}"/>

  <!-- Smirk -->
  <path d="M {cx-s*0.07} {cy+s*0.08} Q {cx+s*0.01} {cy+s*0.12} {cx+s*0.09} {cy+s*0.05}" stroke="{INK}" stroke-width="{s*0.022}" fill="none" stroke-linecap="round"/>
</svg>'''
    return svg


def render(svg_str, out_path, width, height):
    cairosvg.svg2png(
        bytestring=svg_str.encode(),
        write_to=out_path,
        output_width=width,
        output_height=height,
    )
    print(f"  ✓ {out_path}  ({width}×{height})")


assets = '/Users/gatlincarrier/dev/snack-goblins/mobile/assets'
os.makedirs(assets, exist_ok=True)

print("Generating Snack Goblin icons...")

# App Store icon — 1024×1024, no alpha
svg1024 = goblin_svg(1024)
render(svg1024, f'{assets}/icon.png',          1024, 1024)

# Splash icon — centred goblin, no background (used by Expo splash)
render(goblin_svg(512), f'{assets}/splash-icon.png', 512, 512)

# Android adaptive icon foreground (no background; transparent surround)
render(goblin_svg(512), f'{assets}/adaptive-icon.png', 512, 512)

# Favicon
render(goblin_svg(64),  f'{assets}/favicon.png',  32,  32)

print("Done.")
