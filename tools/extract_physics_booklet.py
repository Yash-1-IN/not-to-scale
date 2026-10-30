"""Rebuilds js/data-booklet-physics.js from the IB Physics formula booklet PDF.

    python tools/extract_physics_booklet.py "C:/Users/Yash/Downloads/IB Physics Formula Booklet SL & HL.pdf"
    python tools/extract_physics_booklet.py <pdf> --text    # also print the cleaned text of every page

Needs `pypdf` (pip install pypdf; in a session, `pip install --target <scratch>/pylib pypdf` and set PYTHONPATH).
Run with PYTHONIOENCODING=utf-8 on Windows if you print the text.

What it reads: the first page, which holds the tables the book's captions cite: Fundamental constants (§1),
Unit conversions (§2) and Metric prefixes (§3). The equations of Themes A–E (§4 onward) are NOT parsed (the PDF's
maths text loses its fractions), so they are listed as "not reproduced here"; the build plan has each batch
add the equations its pages use, copied by hand and checked against the PDF.
"""
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "js", "data-booklet-physics.js")

# the PDF flattens subscripts (kB, ε0); put them back the way physics writes them
SYMBOLS = {"NA": "N_A", "kB": "k_B", "ε0": "ε₀", "μ0": "μ₀", "me": "m_e", "mp": "m_p", "mn": "m_n", "R0": "R₀"}
SUP = str.maketrans("0123456789-+", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺")
NOT_SHOWN = {
    "4": "Geometry and trigonometry equations",
    "5": "Uncertainty calculations",
    "6": "Theme A: Space, time and motion",
    "7": "Theme B: The particulate nature of matter",
    "8": "Theme C: Wave behaviour",
    "9": "Theme D: Fields",
    "10": "Theme E: Nuclear and quantum physics",
}


def clean(text):
    """The PDF uses mathematical italic letters and a real minus sign; fold them to plain text."""
    text = unicodedata.normalize("NFKC", text).replace("\u2212", "-")
    return re.sub(r"[ \t]+", " ", text)


def sup(m):
    return m.group(1) + m.group(2).translate(SUP)


def pretty(value):
    """'6.67 × 10-11 N m2 kg-2' -> '6.67 × 10⁻¹¹ N m² kg⁻²'."""
    value = re.sub(r"(× ?10)(-?\d+)", lambda m: "× 10" + m.group(2).translate(SUP), value)
    value = re.sub(r"(?<=[A-Za-z]) ?(-?\d)(?=\s|$|\))", lambda m: m.group(1).translate(SUP), value)
    value = re.sub(r"([⁰¹²³⁴⁵⁶⁷⁸⁹])([A-Za-z])", r"\1 \2", value)   # "10¹¹m" -> "10¹¹ m"
    value = re.sub(r"\s+", " ", value).strip()
    return value.replace("×  10", "× 10")


def main():
    pdf = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
    if not pdf:
        sys.exit(__doc__)
    from pypdf import PdfReader
    pages = [clean(p.extract_text()) for p in PdfReader(pdf).pages]
    if "--text" in sys.argv:
        for i, t in enumerate(pages, 1):
            print("=== PAGE", i)
            print(t)
    first = pages[0]

    body_at = first.index("Fundamental Constants", first.index("Theme E"))     # skip the table of contents

    def between(start, end):
        a = first.index(start, body_at) + len(start)
        return first[a:first.index(end, a)]

    # 1. Fundamental constants: "symbol quantity value", one per line (a few values wrap onto a second line)
    block = between("Symbol Quantity Approximate Value", "Geometry and Trigonometry Equations")
    lines = [l.strip() for l in block.splitlines() if l.strip()]
    merged = []
    for l in lines:
        if merged and (l.startswith("=") or not re.match(r"^\S+ ", l)):
            merged[-1] += " " + l
        else:
            merged.append(l)
    # a value starts at the first number (or at "4π" for μ0); the quantity is what lies between the symbol and it
    consts = []
    for l in merged:
        m = re.match(r"^(\S+) (.+?) ((?:\d|4π).*)$", l)
        if not m:
            sys.exit("could not read constants line: " + l)
        sym, quantity, value = m.groups()
        consts.append([SYMBOLS.get(sym, sym), quantity, pretty(value)])
    # 2. Unit conversions: "name value"
    block = between("Unit Conversions", "Uncertainty Calculations")
    conv = []
    for l in (x.strip() for x in block.splitlines() if x.strip()):
        if l == "π" and conv:                      # the fraction 180°/π arrives split over two lines
            conv[-1] += "/π"
        else:
            conv.append(l)
    # 3. Metric prefixes
    block = first[first.index("Symbol Prefix Value", body_at) + len("Symbol Prefix Value"):]
    prefixes = []
    for l in (x.strip() for x in block.splitlines() if x.strip()):
        m = re.match(r"^(\S+) (\S+) (10)(-?\d+)$", l)
        if m:
            prefixes.append([m.group(1), m.group(2), "10" + m.group(4).translate(SUP)])

    data = {
        "sections": {
            "1": {"title": "Fundamental constants", "type": "table", "columns": ["Symbol", "Quantity", "Approximate value"], "rows": consts},
            "2": {"title": "Unit conversions", "type": "list", "rows": [r for r in (split_conversion(c) for c in conv) if r]},
            "3": {"title": "Metric prefixes", "type": "table", "columns": ["Symbol", "Prefix", "Value"], "rows": prefixes},
        },
        "notShown": NOT_SHOWN,
    }
    header = ("// The IB Physics formula booklet (first assessment 2025), as shown by the Data booklet panel on the Physics side.\n"
              "// GENERATED by tools/extract_physics_booklet.py from the PDF: §1 constants, §2 unit conversions, §3 metric prefixes.\n"
              "// The equations of Themes A–E (§4–§10) are added by hand as pages need them (see PHYSICS_PLAN.md §4).\n"
              "// Re-running the script rewrites this file, so put hand-added sections in js/data-booklet-physics-extra.js instead.\n\n")
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(header + "const BookletDataPhysics = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
    print("wrote", OUT, "-", len(consts), "constants,", len(conv), "conversions,", len(prefixes), "prefixes")


def split_conversion(line):
    """'1 light year (ly) 9.46 × 1015 m' -> ['1 light year (ly)', '9.46 × 10¹⁵ m']."""
    line = pretty(line)
    line = line.replace("℃", "°C").replace("180°/π", "180°/π")
    m = re.match(r"^(1 [a-z\- ]+ \([a-zA-Z]+\)|Temperature \(K\)|hc) (.*)$", line)
    return [m.group(1), m.group(2)] if m else None


if __name__ == "__main__":
    main()
