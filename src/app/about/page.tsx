import Link from 'next/link'
import { MessageSquare, Briefcase, Library, Palette, MessagesSquare, ScanText, Mail, LayoutGrid } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'אודות — Grafi | קהילת הגרפיקאים החרדים',
  description: 'Grafi היא הפלטפורמה המרכזית לגרפיקאים חרדים — קהילה, השראה, לוח עבודות וכלים מקצועיים.',
  openGraph: {
    title: 'Grafi — קהילת הגרפיקאים החרדים',
    description: 'Grafi היא הפלטפורמה המרכזית לגרפיקאים חרדים — קהילה, השראה, לוח עבודות וכלים מקצועיים.',
    type: 'website',
  },
}

const features = [
  { icon: <MessageSquare size={20} />, title: "צ'אט חי", desc: 'תקשורת ישירה בין חברי הקהילה בזמן אמת' },
  { icon: <MessagesSquare size={20} />, title: 'פורום', desc: 'דיונים מקצועיים, שאלות ותשובות, שיתוף ידע' },
  { icon: <Briefcase size={20} />, title: 'לוח עבודות', desc: 'הזדמנויות תעסוקה, פרויקטים פרילנסרים ומכרזים' },
  { icon: <Palette size={20} />, title: 'ספריית השראה', desc: 'גלריה משותפת של עיצובים מרהיבים לעידוד יצירתיות' },
  { icon: <LayoutGrid size={20} />, title: 'גלריית עבודות', desc: 'הצג את העבודות שלך לכל הקהילה' },
  { icon: <Library size={20} />, title: 'חומרים לשימוש', desc: 'משאבים, תבניות וכלים לגרפיקאי' },
  { icon: <ScanText size={20} />, title: 'זיהוי פונטים', desc: 'כלי AI מתקדם לזיהוי פונטים מתמונות' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f13' }}>

      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 py-24 text-center"
        style={{ background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1066 50%, #1a0a2e 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(rgba(124,58,237,.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 65%)', filter: 'blur(80px)' }}
        />

        <div className="relative mx-auto max-w-3xl">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ background: 'rgba(124,58,237,.2)', border: '1px solid rgba(124,58,237,.4)', color: '#c4b5fd' }}
          >
            ✨ קהילה ייחודית לגרפיקאים חרדים
          </div>
          <h1 className="mb-3 text-5xl font-black text-white sm:text-6xl">Grafi</h1>
          <p className="mb-4 text-xl font-semibold" style={{ color: '#c4b5fd' }}>
            קהילת הגרפיקאים החרדים
          </p>
          <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: 'rgba(255,255,255,.6)' }}>
            המקום שבו גרפיקאים חרדים מתחברים, שותפים ידע, מוצאים השראה ומקדמים את הקריירה שלהם — בסביבה מכבדת ומותאמת.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">

        {/* Mission */}
        <div
          className="rounded-3xl p-8"
          style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}
        >
          <h2 className="mb-4 text-2xl font-bold text-white">החזון שלנו</h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,.7)' }}>
            Grafi נוסדה מתוך הכרה שלגרפיקאים חרדים יש צרכים ייחודיים — סביבה מכבדת, תוכן מתאים, ורשת קשרים מקצועית בתוך עולם ההלכה. אנחנו בנינו את הפלטפורמה הזו כדי לחבר בין אנשי מקצוע, לעודד שיתוף ידע ולפתוח דלתות לתעסוקה.
          </p>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,.7)' }}>
            אנו מאמינים שקהילה חזקה מגדילה את ההצלחה האישית של כל חבר. כשגרפיקאי מתחיל מקבל מענטור מנוסה, כשפרילנסר מוצא לקוח דרך הרשת שלנו, כשמעצב מתעורר בבוקר עם השראה חדשה — זה בדיוק מה שאנחנו רוצים להביא לעולם.
          </p>
        </div>

        {/* Features */}
        <div>
          <h2 className="mb-8 text-center text-2xl font-bold text-white">מה יש בפלטפורמה?</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.03]"
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(124,58,237,.2)', color: '#a78bfa' }}
                >
                  {f.icon}
                </div>
                <h3 className="mb-1.5 font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { emoji: '🤝', title: 'קהילה', desc: 'עזרה הדדית, שיתוף ידע, ויחד אנחנו חזקים יותר' },
            { emoji: '✡️', title: 'ערכים', desc: 'פלטפורמה שומרת הלכה ומכבדת את אורח החיים החרדי' },
            { emoji: '🚀', title: 'קריירה', desc: 'מהמתחיל ועד הוותיק — כלים לצמיחה מקצועית' },
          ].map((v) => (
            <div
              key={v.title}
              className="rounded-2xl p-6 text-center"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}
            >
              <div className="mb-3 text-3xl">{v.emoji}</div>
              <h3 className="mb-2 font-bold text-white">{v.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.12), rgba(236,72,153,.06))', border: '1px solid rgba(124,58,237,.2)' }}
        >
          <h2 className="mb-2 text-2xl font-bold text-white">יצירת קשר</h2>
          <p className="mb-6 text-sm" style={{ color: 'rgba(255,255,255,.6)' }}>
            שאלות, הצעות, בקשות שותפות או דיווח על בעיה? נשמח לשמוע ממך.
          </p>
          <a
            href="mailto:y0504192123@gmail.com"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-85 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 30px rgba(124,58,237,.35)' }}
          >
            <Mail size={16} />
            y0504192123@gmail.com
          </a>
        </div>

        {/* Back */}
        <div className="flex justify-center gap-4 pb-4">
          <Link
            href="/login"
            className="text-sm font-medium transition hover:opacity-80"
            style={{ color: 'rgba(255,255,255,.4)' }}
          >
            ← חזרה
          </Link>
          <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
          <Link href="/terms" className="text-sm transition hover:opacity-80" style={{ color: 'rgba(255,255,255,.35)' }}>תנאי שימוש</Link>
          <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
          <Link href="/privacy" className="text-sm transition hover:opacity-80" style={{ color: 'rgba(255,255,255,.35)' }}>פרטיות</Link>
        </div>

      </div>
    </div>
  )
}
