// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

let _modelPromise: Promise<{ processor: Any; model: Any }> | null = null

function loadModel(): Promise<{ processor: Any; model: Any }> {
  if (!_modelPromise) {
    _modelPromise = (async () => {
      const mod = await import('@huggingface/transformers')
      // Point cache to /tmp so it persists across warm invocations on Vercel
      mod.env.cacheDir = '/tmp/.cache/transformers'
      mod.env.allowRemoteModels = true
      const [processor, model] = await Promise.all([
        mod.AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32'),
        mod.CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32', {
          dtype: 'fp32',
        }),
      ])
      return { processor, model }
    })()
  }
  return _modelPromise!
}

export async function computeImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const mod = await import('@huggingface/transformers')
  const { processor, model } = await loadModel()

  const base64 = imageBuffer.toString('base64')
  const image = await mod.RawImage.fromURL(`data:image/png;base64,${base64}`)
  const inputs = await processor(image)
  const { image_embeds } = await model(inputs)

  // image_embeds is [1, 512] — extract and L2-normalize
  const raw = Array.from(image_embeds.data as Float32Array) as number[]
  const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0))
  return norm > 0 ? raw.map(v => v / norm) : raw
}
