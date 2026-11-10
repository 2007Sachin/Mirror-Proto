"""Turn a seat's portrait renders into the talking-head frames the Roast Room uses.

The same processing the original seven went through (OtherWorlds art/build_portraits.py in
the source workspace): each edit (open, mid, blink) is aligned back onto the base with ORB
features and a similarity transform, and only the changed region (mouth or eyes) is feathered
onto the base. Every frame is then pixel-identical outside the mouth or eyes, which keeps the
swap from jittering. The green screen is keyed to alpha, every head is cropped to the same
scale, and the frames land in <out>/<key>-<shape>.webp.

    python build_portraits.py sheet <dir>                     photo next to every candidate, for picking
    python build_portraits.py build <dir> <key> --out <dir>   base/open/mid/blink.png -> <key>-*.webp

<dir> is the seat's portrait folder (photo.jpg, cand*.png, base.png, open.png, mid.png, blink.png).
Needs opencv-python and numpy (pip install opencv-python numpy).
"""
import sys
from pathlib import Path

import cv2
import numpy as np

W = 1024          # working size
SIZE = 560        # output size (square)
HEAD_W = 375      # target head width (px at W) a little under the crown

# region each shape is allowed to touch, as a fraction box (x0, y0, x1, y1) of the frame
REGION = {"open": (0.30, 0.47, 0.70, 0.82), "mid": (0.30, 0.47, 0.70, 0.82), "blink": (0.24, 0.20, 0.76, 0.52)}


def load(p):
    im = cv2.imread(str(p), cv2.IMREAD_COLOR)
    return cv2.resize(im, (W, W), interpolation=cv2.INTER_AREA)


def align(base, var, region):
    """Similarity-align var onto base using features outside the region that changed."""
    orb = cv2.ORB_create(6000)
    mask = np.full(base.shape[:2], 255, np.uint8)
    x0, y0, x1, y1 = (np.array(region) * W).astype(int)
    mask[y0:y1, x0:x1] = 0
    g1, g2 = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY), cv2.cvtColor(var, cv2.COLOR_BGR2GRAY)
    k1, d1 = orb.detectAndCompute(g1, mask)
    k2, d2 = orb.detectAndCompute(g2, mask)
    m = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d1, d2)
    m = sorted(m, key=lambda x: x.distance)[:800]
    src = np.float32([k2[x.trainIdx].pt for x in m])
    dst = np.float32([k1[x.queryIdx].pt for x in m])
    M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3)
    warped = cv2.warpAffine(var, M, (W, W), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return warped, M, int(inl.sum())


def patch_mask(base, warped, region):
    """Feathered ellipse around where the edit actually differs, clipped to the region."""
    d = cv2.absdiff(base, warped).max(axis=2).astype(np.float32)
    d = cv2.GaussianBlur(d, (0, 0), 6)
    x0, y0, x1, y1 = (np.array(region) * W).astype(int)
    roi = np.zeros_like(d)
    roi[y0:y1, x0:x1] = d[y0:y1, x0:x1]
    ys, xs = np.where(roi > 28)
    if len(xs) < 50:
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 3, (y1 - y0) / 3
    else:
        lo, hi = np.percentile(xs, [2, 98]), np.percentile(ys, [2, 98])
        cx, cy = lo.mean(), hi.mean()
        rx, ry = (lo[1] - lo[0]) / 2 + 26, (hi[1] - hi[0]) / 2 + 26
    m = np.zeros((W, W), np.float32)
    cv2.ellipse(m, (int(cx), int(cy)), (int(rx), int(ry)), 0, 0, 360, 1.0, -1)
    m = cv2.GaussianBlur(m, (0, 0), 14)
    clip = np.zeros_like(m)
    clip[y0:y1, x0:x1] = 1
    clip = cv2.GaussianBlur(clip, (0, 0), 10)
    return (m * clip)[..., None]


def figure(base, warped):
    """Soft mask of pixels that are the figure (not green screen) in both frames, so a
    patch never drags background into the face or tints it while matching skin tone."""
    def fg(img):
        f = img.astype(np.float32)
        return (f[..., 1] - np.maximum(f[..., 0], f[..., 2])) < 20
    both = (fg(base) & fg(warped)).astype(np.uint8)
    both = cv2.erode(both, np.ones((9, 9), np.uint8))
    return cv2.GaussianBlur(both.astype(np.float32), (0, 0), 3)[..., None]


def key_green(img):
    """Green screen to straight alpha, with despill on the edges."""
    f = img.astype(np.float32)
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    spill = g - np.maximum(r, b)
    a = 1.0 - np.clip((spill - 40) / 70, 0, 1)
    a = cv2.GaussianBlur(a, (0, 0), 0.8)
    # despill: clamp green to the max of red and blue where it leads
    g2 = np.where(spill > 0, np.maximum(r, b), g)
    out = np.dstack([b, g2, r, a * 255]).clip(0, 255).astype(np.uint8)
    return out


def crop_box(alpha, zoom=1.0):
    """Square crop that puts every head at about the same size: the figure's width a
    little under the crown is scaled toward HEAD_W, with a little headroom on top.
    A crop larger than the frame is padded with transparency; the table hides it."""
    solid = alpha > 40
    ys = np.where(solid.any(1))[0]
    top = int(ys.min())
    xs = np.where(solid[min(top + 120, W - 1)])[0]
    head = xs.max() - xs.min()
    side = int(W * (head / HEAD_W) ** 0.85 * zoom)
    cx = int((xs.max() + xs.min()) / 2)
    y0 = top - int(side * 0.07)
    return cx - side // 2, y0, cx - side // 2 + side, y0 + side


def cut(img, box):
    """Crop with transparent padding where the box leaves the frame."""
    x0, y0, x1, y1 = box
    out = np.zeros((y1 - y0, x1 - x0, img.shape[2]), img.dtype)
    sx0, sy0, sx1, sy1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, W)
    out[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = img[sy0:sy1, sx0:sx1]
    return out


def build(d, key, out, zoom=1.0):
    base = load(d / "base.png")
    frames = {"base": base}
    report = []
    for shape, region in REGION.items():
        p = d / f"{shape}.png"
        if not p.exists():
            print(f"  no {p.name}; {shape} will reuse the base frame")
            continue
        warped, M, inliers = align(base, load(p), region)
        scale = float(np.hypot(M[0, 0], M[1, 0]))
        m = patch_mask(base, warped, region)
        # AI edits shift skin tone; match the patch to the base on its feathered rim
        ring = (m[..., 0] > 0.15) & (m[..., 0] < 0.6)
        if ring.sum() > 200:
            warped = np.clip(warped.astype(np.float32) + (base[ring].mean(0) - warped[ring].mean(0)), 0, 255)
        frames[shape] = (base * (1 - m) + warped * m).astype(np.uint8)
        report.append(f"{shape}: {inliers} inliers, scale {scale:.3f}")
    keyed = {k: key_green(v) for k, v in frames.items()}
    box = crop_box(keyed["base"][..., 3], zoom)
    out.mkdir(parents=True, exist_ok=True)
    tiles = []
    for k, v in keyed.items():
        c = cv2.resize(cut(v, box), (SIZE, SIZE), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(out / f"{key}-{k}.webp"), c, [cv2.IMWRITE_WEBP_QUALITY, 88])
        bg = np.full((SIZE, SIZE, 3), (34, 26, 18), np.float32)
        a = c[..., 3:4] / 255.0
        tiles.append((c[..., :3] * a + bg * (1 - a)).astype(np.uint8))
    cv2.imwrite(str(d / "review.jpg"), np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 82])
    print(key, "|", "; ".join(report), f"| frames in {out}, review sheet {d / 'review.jpg'}")


def sheet(d):
    """photo.jpg, then every candidate, side by side at the same height."""
    files = [d / "photo.jpg"] + sorted(d.glob("cand*.png"))
    tiles = []
    for f in files:
        im = cv2.imread(str(f), cv2.IMREAD_COLOR)
        if im is None:
            continue
        h, w = im.shape[:2]
        s = min(h, w)
        im = im[0:s, (w - s) // 2:(w - s) // 2 + s]
        im = cv2.resize(im, (420, 420), interpolation=cv2.INTER_AREA)
        cv2.putText(im, f.stem, (12, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
        tiles.append(im)
    cv2.imwrite(str(d / "candidates.jpg"), np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(f"sheet: {d / 'candidates.jpg'}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) >= 2 and a[0] == "sheet":
        sheet(Path(a[1]))
    elif len(a) >= 3 and a[0] == "build":
        out = Path(a[a.index("--out") + 1]) if "--out" in a else Path("app/public/portraits")
        zoom = float(a[a.index("--zoom") + 1]) if "--zoom" in a else 1.0
        build(Path(a[1]), a[2], out, zoom)
    else:
        print(__doc__)
        sys.exit(1)
