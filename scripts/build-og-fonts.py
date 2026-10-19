"""Static font files for the social share cards, made from the site's variable fonts.

Satori, which lays out the cards, can't read variable fonts, so this pins the three weights the cards
use (Martian Mono 500 at the width browsers draw it, Schibsted Grotesk 400 and 600) and keeps Latin
only. Run it again only if the fonts in public/fonts/ change:

    python3 -m venv .venv && .venv/bin/pip install fonttools brotli
    .venv/bin/python scripts/build-og-fonts.py
"""

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

LATIN = [
    *range(0x20, 0x7F),
    *range(0xA0, 0x180),
    0xB7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x20AC, 0x2122,
    0x2190, 0x2192,
]

JOBS = [
    ("MartianMono-Variable.woff2", {"wght": 500, "wdth": 100}, "MartianMono-Medium.ttf"),
    ("SchibstedGrotesk-Variable.woff2", {"wght": 400}, "SchibstedGrotesk-Regular.ttf"),
    ("SchibstedGrotesk-Variable.woff2", {"wght": 600}, "SchibstedGrotesk-SemiBold.ttf"),
]

for source, axes, target in JOBS:
    # recalcTimestamp off, so running it again gives byte-identical files.
    font = instantiateVariableFont(
        TTFont(f"public/fonts/{source}", recalcTimestamp=False), axes, updateFontNames=True
    )
    font.flavor = None
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=LATIN)
    subsetter.subset(font)
    font.save(f"src/assets/fonts/{target}")
    print(f"src/assets/fonts/{target}")
