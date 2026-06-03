// Segment an image into individual letter crops using projection profiles.
// Returns up to MAX_LETTERS PNG buffers, each 112×112 (white background).

const MAX_LETTERS = 8
const LETTER_IMG_SIZE = 112

interface BBox { x: number; y: number; w: number; h: number }

export async function segmentLetters(imageBuffer: Buffer): Promise<Buffer[]> {
  const sharp = (await import('sharp')).default

  // Flatten alpha, grayscale, normalize contrast
  const { data, info } = await sharp(imageBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .grayscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const px = new Uint8Array(data)

  // Otsu threshold → binary mask (1 = ink)
  const thresh = otsu(px)
  const ink = (x: number, y: number) => px[y * width + x] < thresh ? 1 : 0

  // Horizontal + vertical projection profiles
  const colInk = new Float32Array(width)
  const rowInk = new Float32Array(height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = ink(x, y)
      colInk[x] += v
      rowInk[y] += v
    }
  }

  // Find text row band
  const minRow = height * 0.015
  let rMin = 0, rMax = height - 1
  for (let y = 0; y < height; y++) { if (rowInk[y] >= minRow) { rMin = y; break } }
  for (let y = height - 1; y >= 0; y--) { if (rowInk[y] >= minRow) { rMax = y; break } }
  if (rMax <= rMin) return []

  // Smooth column profile with Gaussian (σ=2)
  const smooth = gaussSmooth(colInk, 2)

  // Find contiguous letter segments in column profile
  const minColInk = Math.max(1, (rMax - rMin) * 0.04)
  const bboxes: BBox[] = []
  let start = -1

  for (let x = 0; x <= width; x++) {
    const v = x < width ? smooth[x] : 0
    if (v >= minColInk && start === -1) {
      start = x
    } else if (v < minColInk && start !== -1) {
      const w = x - start
      // Accept if width is between 5px and 60% of image width
      if (w >= 5 && w <= width * 0.6) {
        bboxes.push({ x: start, y: rMin, w, h: rMax - rMin + 1 })
      }
      start = -1
    }
  }

  if (bboxes.length === 0) return []

  // Take up to MAX_LETTERS, evenly spread if too many
  const selected = bboxes.length <= MAX_LETTERS
    ? bboxes
    : Array.from({ length: MAX_LETTERS }, (_, i) =>
        bboxes[Math.round(i * (bboxes.length - 1) / (MAX_LETTERS - 1))])

  const PAD = 6
  return Promise.all(selected.map(bbox =>
    sharp(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .extract({
        left:   Math.max(0, bbox.x - PAD),
        top:    Math.max(0, bbox.y - PAD),
        width:  Math.min(width  - Math.max(0, bbox.x - PAD), bbox.w + 2 * PAD),
        height: Math.min(height - Math.max(0, bbox.y - PAD), bbox.h + 2 * PAD),
      })
      .resize(LETTER_IMG_SIZE, LETTER_IMG_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer()
  ))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function otsu(pixels: Uint8Array): number {
  const hist = new Int32Array(256)
  for (const p of pixels) hist[p]++
  const N = pixels.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0, wB = 0, max = 0, t = 128
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue
    const wF = N - wB; if (!wF) break
    sumB += i * hist[i]
    const between = wB * wF * ((sumB / wB) - (sum - sumB) / wF) ** 2
    if (between > max) { max = between; t = i }
  }
  return t
}

function gaussSmooth(arr: Float32Array, sigma: number): Float32Array {
  const r = Math.ceil(3 * sigma)
  const k: number[] = []
  let ks = 0
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); ks += v }
  const kn = k.map(v => v / ks)
  const out = new Float32Array(arr.length)
  for (let i = 0; i < arr.length; i++) {
    let v = 0
    for (let j = 0; j < kn.length; j++) {
      const idx = i + j - r
      v += (idx >= 0 && idx < arr.length ? arr[idx] : 0) * kn[j]
    }
    out[i] = v
  }
  return out
}
