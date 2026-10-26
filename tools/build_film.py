#!/usr/bin/env python3
"""Turn each scenes/NN-name.mp4 into a scroll-scrubbed image sequence.

Writes assets/film/<name>/<tier>/NNNN.webp and assets/film/manifest.json. Tiers:
    x  2880 px wide, for large high-density screens (only when the clip is 4K)
    d  1920 px wide, for ordinary landscape screens
    m  a 2:3 crop from the centre at full source sharpness, for phones in portrait
Run from anywhere:
    python3 tools/build_film.py [name ...]
"""
import glob, json, os, re, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = int(os.environ.get("FPS", 24))
OUT = os.path.join(ROOT, "assets", "film")
SHARPEN = "unsharp=5:5:0.35"

only = set(sys.argv[1:])
clips = sorted(glob.glob(os.path.join(ROOT, "scenes", "[0-9][0-9]-*.mp4")))
if not clips:
    sys.exit("no clips in scenes/")

man_path = os.path.join(OUT, "manifest.json")
manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}

def tiers(h):
    t = {}
    if h >= 2000:
        t["x"] = (f"scale=2880:-2:flags=lanczos,{SHARPEN}", 82)
    t["d"] = ("scale=1920:-2:flags=lanczos" + ("" if h >= 1080 else f",{SHARPEN}"), 84)
    # 2:3 centre crop at source pixels, then down to at most 1800 px tall
    t["m"] = (f"crop=ih*2/3:ih,scale=-2:'min(1800,ih)':flags=lanczos,{SHARPEN}", 80)
    return t

def encode(job):
    src, dst, q = job
    subprocess.run(["cwebp", "-quiet", "-q", str(q), "-m", "4", src, "-o", dst], check=True)

for clip in clips:
    name = re.sub(r"^\d\d-", "", os.path.splitext(os.path.basename(clip))[0])
    if only and name not in only:
        continue
    h = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=height",
                            "-of", "csv=p=0", clip], capture_output=True, text=True).stdout.strip())
    shutil.rmtree(os.path.join(OUT, name), ignore_errors=True)
    count = 0
    for key, (vf, q) in tiers(h).items():
        tmp = tempfile.mkdtemp()
        subprocess.run(["ffmpeg", "-v", "error", "-i", clip, "-vf", f"fps={FPS},{vf}",
                        os.path.join(tmp, "%04d.png")], check=True)
        pngs = sorted(glob.glob(os.path.join(tmp, "*.png")))
        d = os.path.join(OUT, name, key)
        os.makedirs(d)
        with ThreadPoolExecutor(os.cpu_count()) as ex:
            list(ex.map(encode, [(p, os.path.join(d, f"{i:04d}.webp"), q) for i, p in enumerate(pngs)]))
        shutil.rmtree(tmp)
        count = len(pngs)
        print(f"{name}/{key}: {count} frames")
    manifest[name] = {"count": count, "fps": FPS, "source_height": h, "tiers": list(tiers(h))}

json.dump(manifest, open(man_path, "w"), indent=1)
print(json.dumps(manifest))
