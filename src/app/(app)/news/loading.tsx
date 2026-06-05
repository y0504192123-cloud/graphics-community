export default function Loading() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-purple-600" />
          <div className="absolute inset-2 animate-pulse rounded-full"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.15),rgba(109,40,217,.08))' }} />
        </div>
        <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--tx3)' }}>טוען...</p>
      </div>
    </div>
  )
}
