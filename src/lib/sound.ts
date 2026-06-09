let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!_ctx) _ctx = new Ctor()
  return _ctx
}

export function resumeAudio() {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {}
}

export function playPing() {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {}
}
