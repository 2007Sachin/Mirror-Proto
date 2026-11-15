// Small, tested statistics helpers. Every number the stats items state comes from here.
const Z975 = 1.959964 // two-sided alpha 0.05
const Z80 = 0.841621 // power 0.8

// Complementary error function for x >= 0 (Abramowitz and Stegun 7.1.26, abs error < 1.5e-7).
function erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * x)
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  return poly * Math.exp(-x * x)
}

export interface TwoProp { p1: number; p2: number; diff: number; z: number; p: number; ci: [number, number] }

/** Two-proportion z-test (pooled) for control x1/n1 vs variant x2/n2, with an unpooled 95% interval on the difference. */
export function twoProp(x1: number, n1: number, x2: number, n2: number): TwoProp {
  const p1 = x1 / n1, p2 = x2 / n2, pool = (x1 + x2) / (n1 + n2)
  const z = (p2 - p1) / Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2))
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
  const diff = p2 - p1
  return { p1, p2, diff, z, p: erfc(Math.abs(z) / Math.SQRT2), ci: [diff - Z975 * se, diff + Z975 * se] }
}

/** Users needed per arm to detect p1 -> p2 at alpha 0.05 (two-sided) and power 0.8. Normal approximation. */
export function sampleSizePerArm(p1: number, p2: number): number {
  return Math.ceil(((Z975 + Z80) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2))) / (p2 - p1) ** 2)
}

// ponytail: two groups only (one degree of freedom), which is all the SRM items need.
export function srm(observed: [number, number], ratio: [number, number] = [1, 1]): { chi2: number; p: number } {
  const total = observed[0] + observed[1], rs = ratio[0] + ratio[1]
  const exp = [(total * ratio[0]) / rs, (total * ratio[1]) / rs]
  const chi2 = observed.reduce((s, o, i) => s + (o - exp[i]) ** 2 / exp[i], 0)
  return { chi2, p: erfc(Math.sqrt(chi2 / 2)) }
}

/** Chance of at least one false positive across k independent tests at level alpha. */
export const familyWise = (k: number, alpha = 0.05) => 1 - (1 - alpha) ** k

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
