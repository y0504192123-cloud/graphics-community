export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] flex items-center justify-center px-4 py-12">

      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="animate-blob absolute -top-60 -right-60 h-[700px] w-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,.35) 0%, transparent 70%)' }}
        />
        <div
          className="animate-blob absolute top-1/3 -left-48 h-[500px] w-[500px] rounded-full animation-delay-4s"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,.2) 0%, transparent 70%)' }}
        />
        <div
          className="animate-blob absolute -bottom-48 right-1/4 h-[450px] w-[450px] rounded-full animation-delay-2s"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,.25) 0%, transparent 70%)' }}
        />
        {/* Grid overlay */}
        <div className="grid-pattern absolute inset-0 opacity-100" />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, #0a0a0f 100%)' }} />
      </div>

      {/* Floating design elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float absolute right-[10%] top-[15%] h-2 w-2 rounded-full bg-purple-400/40 animation-delay-150" />
        <div className="animate-float absolute left-[15%] top-[25%] h-1.5 w-1.5 rounded-full bg-pink-400/30 animation-delay-600" />
        <div className="animate-float absolute right-[20%] bottom-[20%] h-3 w-3 rounded-full bg-violet-400/20 animation-delay-300" />
        <div className="animate-float absolute left-[8%] bottom-[30%] h-1 w-1 rounded-full bg-purple-300/50 animation-delay-450" />
        <div className="animate-float absolute left-[40%] top-[8%] h-2 w-2 rotate-45 bg-pink-500/20 animation-delay-2s" />
        <div className="animate-float absolute right-[35%] bottom-[12%] h-1.5 w-1.5 rotate-45 bg-purple-400/30 animation-delay-4s" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {children}
      </div>
    </div>
  )
}
