export async function computeDHash(imageBuffer: Buffer): Promise<string> {
  const sharp = (await import('sharp')).default
  const size = 16
  const { data } = await sharp(imageBuffer)
    .resize(size + 1, size, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let bits = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      bits += data[y * (size + 1) + x] > data[y * (size + 1) + x + 1] ? '1' : '0'
    }
  }
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
  }
  return hex
}

export function hammingDistance(hash1: string, hash2: string): number {
  let dist = 0
  const len = Math.min(hash1.length, hash2.length)
  for (let i = 0; i < len; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16)
    for (let b = 0; b < 4; b++) dist += (xor >> b) & 1
  }
  return dist
}
