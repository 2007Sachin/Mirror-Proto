// Pure layout maths for the journey map (one row per node). Wide track on desktop, 320px single column on phones.
export const TRACK_W = 560
export const NARROW_W = 320
export const ROW_H = 108
const SWAY = [0, 1, 0, -1]

export const nodeX = (i: number, w = TRACK_W) => w / 2 + SWAY[i % 4] * (w >= 480 ? 180 : 60)
export const nodeY = (i: number) => ROW_H * i + ROW_H / 2 - 8

/** Smooth S-curve between two node centres. */
export function segmentD(i: number, w = TRACK_W): string {
  const [x0, y0, x1, y1] = [nodeX(i, w), nodeY(i), nodeX(i + 1, w), nodeY(i + 1)]
  const m = (y0 + y1) / 2
  return `M${x0} ${y0} C${x0} ${m} ${x1} ${m} ${x1} ${y1}`
}

/** Ring stroke values for solved/total; never more than a full circle. */
export function ringDash(solved: number, total: number, r: number) {
  const c = 2 * Math.PI * r
  const ratio = total > 0 ? Math.min(1, Math.max(0, solved / total)) : 0
  return { c, dash: c * ratio }
}
