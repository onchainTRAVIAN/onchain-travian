"""Build the old-school troop art.

usage: python3 build.py [--out DIR] [names...]   names like romans-1, nature-6, hero-gauls-3
Without --out the files go to the game's img folders.
"""
import os
import sys
import importlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
IMG = os.path.join(ROOT, "src", "web", "public", "img")

from lib import render_big, render_icon, ICON  # noqa: E402

TRIBES = ["romans", "teutons", "gauls", "natars", "nature"]
PFX = {"romans": "r", "teutons": "t", "gauls": "g", "natars": "n", "nature": "a"}


def registry():
    reg = {}
    for t in TRIBES:
        try:
            mod = importlib.import_module(t)
        except ModuleNotFoundError as e:
            if e.name != t:
                raise
            continue
        for n, fn in getattr(mod, "UNITS", {}).items():
            reg[f"{t}-{n}"] = fn
    try:
        hm = importlib.import_module("heroes")
        for key, fn in hm.HEROES.items():
            reg[f"hero-{key}"] = fn
    except ModuleNotFoundError as e:
        if e.name != "heroes":
            raise
    return reg


def build(name, fn, out=None):
    res = fn()
    cv, box = res[0], res[1]
    icon_cv = res[2] if len(res) > 2 and res[2] is not None else cv
    if name.startswith("hero-"):
        _, tribe, stage = name.split("-")
        pfx = f"h{tribe[0]}{stage}"
        big_path = os.path.join(out, f"hero-{tribe}-{stage}.svg") if out else os.path.join(IMG, "hero", f"{tribe}-{stage}.svg")
        icon_path = os.path.join(out or os.path.join(IMG, "units"), f"hero-{tribe}.svg") if stage == "3" else None
    else:
        tribe, n = name.split("-")
        pfx = f"{PFX[tribe]}{n}"
        big_path = os.path.join(out or os.path.join(IMG, "units", "big"), f"{tribe}-{n}.svg")
        icon_path = os.path.join(out or os.path.join(IMG, "units"), f"{tribe}-{n}{'-i' if out else ''}.svg")
    svg = render_big(cv, pfx + "_")
    os.makedirs(os.path.dirname(big_path), exist_ok=True)
    with open(big_path, "w") as f:
        f.write(svg)
    sizes = [len(svg)]
    if icon_path:
        if out and name.startswith("hero-"):
            icon_path = os.path.join(out, f"hero-{tribe}-i.svg")
        ICON['on'] = True
        try:
            ires = fn()
        finally:
            ICON['on'] = False
        isvg = render_icon(ires[0], pfx + "i", ires[1])
        with open(icon_path, "w") as f:
            f.write(isvg)
        sizes.append(len(isvg))
    return big_path, sizes


def main():
    args = sys.argv[1:]
    out = None
    if "--out" in args:
        i = args.index("--out")
        out = os.path.abspath(args[i + 1])
        del args[i:i + 2]
    reg = registry()
    names = args or sorted(reg)
    for nm in names:
        if nm not in reg:
            print("missing", nm)
            continue
        p, sizes = build(nm, reg[nm], out)
        flag = "  <-- TOO BIG" if sizes[0] > 25000 else ""
        print(f"{nm:16s} {sizes}{flag}")


if __name__ == "__main__":
    main()
