'use client'

import { useState, useActionState } from 'react'
import { signIn, signUp, sendPasswordReset } from './actions'
import type { AuthState } from './actions'

type Props = {
  urlError?: string
  urlMessage?: string
  logoUrl?: string | null
}

const supabaseErrors: Record<string, string> = {
  'Invalid login credentials': 'אימייל או סיסמה שגויים.',
  'Invalid_login_credentials': 'אימייל או סיסמה שגויים.',
  'Email not confirmed': 'נא לאשר את כתובת האימייל שלך.',
  'User already registered': 'כתובת אימייל זו כבר רשומה.',
  auth_failed: 'האימות נכשל. נסה שוב.',
  no_profile: 'לא ניתן לטעון את פרטי המשתמש. פנה למנהל.',
}

function resolveError(raw?: string) {
  if (!raw) return null
  const decoded = decodeURIComponent(raw)
  return supabaseErrors[decoded] ?? decoded
}

const fieldCls = 'w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-200 focus:border-purple-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/20'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

export default function LoginForm({ urlError, urlMessage, logoUrl }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showForgot, setShowForgot] = useState(false)

  const [signInState, signInAction, signInPending] = useActionState<AuthState, FormData>(signIn, null)
  const [signUpState, signUpAction, signUpPending] = useActionState<AuthState, FormData>(signUp, null)
  const [forgotState, forgotAction, forgotPending] = useActionState<AuthState, FormData>(sendPasswordReset, null)

  const isPending = mode === 'login' ? signInPending : signUpPending
  const formAction = mode === 'login' ? signInAction : signUpAction

  const rawError = mode === 'login' ? signInState?.error : signUpState?.error
  const isPendingError = rawError === 'pending' || urlMessage === 'pending'
  const isRejected = rawError === 'rejected' || urlMessage === 'rejected'
  const showSignUpSuccess = signUpState?.message === 'pending'

  const displayError = isPendingError || isRejected || showSignUpSuccess
    ? null
    : resolveError(rawError) ?? resolveError(urlError)

  return (
    <div
      className="glass-card w-full max-w-md rounded-3xl p-8 shadow-2xl"
      style={{ boxShadow: '0 25px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)' }}
    >

      {/* Logo */}
      <div className="mb-7 text-center">
        {logoUrl ? (
          <div className="mb-4 flex justify-center">
            <img src={logoUrl} alt="Grafi" className="max-w-[240px] object-contain" style={{ maxHeight: '80px' }} />
          </div>
        ) : (
          <div className="relative mx-auto mb-4 w-fit">
            <div
              className="animate-pulse-glow flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
                <path d="M7 25 L16 7 L25 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 19.5 L22 19.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16" cy="7" r="2.5" fill="white" />
              </svg>
            </div>
            <div className="absolute -inset-2 -z-10 rounded-3xl opacity-40 blur-xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }} />
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="mb-5 flex gap-1 rounded-2xl bg-white/[0.04] p-1">
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 ${
              mode === m ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
            style={mode === m ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' } : {}}
          >
            {m === 'login' ? 'התחברות' : 'הרשמה'}
          </button>
        ))}
      </div>

      {/* ── Status banners ── */}
      {(isPendingError || (!showSignUpSuccess && urlMessage === 'pending')) && (
        <div className="mb-5 animate-fade-up rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] p-4 text-center">
          <div className="mb-1 text-xl">⏳</div>
          <p className="text-sm font-bold text-amber-300">החשבון שלך ממתין לאישור</p>
          <p className="mt-1 text-xs text-amber-400/80">המנהל יבדוק את בקשתך ויאשר אותה בהקדם</p>
        </div>
      )}
      {isRejected && (
        <div className="mb-5 animate-fade-up rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-4 text-center">
          <div className="mb-1 text-xl">❌</div>
          <p className="text-sm font-bold text-red-300">בקשתך נדחתה</p>
          <p className="mt-1 text-xs text-red-400/80">צור קשר עם מנהל הקהילה למידע נוסף</p>
        </div>
      )}
      {showSignUpSuccess && (
        <div className="mb-5 animate-fade-up rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4 text-center">
          <div className="mb-1 text-xl">✅</div>
          <p className="text-sm font-bold text-emerald-300">הבקשה נשלחה בהצלחה!</p>
          <p className="mt-1 text-xs text-emerald-400/80">המנהל יסקור את פרטיך ויאשר את הכניסה בהקדם</p>
        </div>
      )}
      {displayError && (
        <div className="mb-5 flex animate-fade-up items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
          <span className="text-red-400">⚠</span>
          {displayError}
        </div>
      )}

      {/* Main form */}
      <form action={formAction} className="space-y-3.5">
        <div>
          <label className={labelCls}>כתובת אימייל</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder=""
            className={fieldCls}
            dir="ltr"
          />
        </div>

        <div>
          <label className={labelCls}>סיסמה</label>
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder=""
            className={fieldCls}
            dir="ltr"
          />
        </div>

        {/* Signup-only extra fields */}
        {mode === 'signup' && (
          <>
            <div className="my-1 h-px bg-white/[0.05]" />

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>שם מלא <span className="text-red-400">*</span></label>
                <input name="full_name" required placeholder="" className={fieldCls} />
              </div>

              <div>
                <label className={labelCls}>עיר <span className="text-red-400">*</span></label>
                <input name="city" required placeholder="" className={fieldCls} />
              </div>

              <div>
                <label className={labelCls}>שנות ניסיון <span className="text-red-400">*</span></label>
                <input
                  name="years_experience"
                  type="number"
                  required
                  min="0"
                  max="50"
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`${fieldCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                  dir="ltr"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>קישור לתיק עבודות (אם יש)</label>
                <input
                  name="portfolio_url"
                  type="url"
                  placeholder=""
                  className={fieldCls}
                  dir="ltr"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>טלפון</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder=""
                  className={fieldCls}
                  dir="ltr"
                />
              </div>
            </div>

            <p className="rounded-xl border border-purple-500/20 bg-purple-500/[0.06] px-3 py-2.5 text-xs text-purple-300">
              💡 לאחר ההרשמה, הבקשה תועבר לאישור מנהל. תקבל גישה לאחר אישור.
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5">
              <input
                type="checkbox"
                name="agreed_to_terms"
                required
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-purple-500"
              />
              <span className="text-xs leading-relaxed text-slate-400">
                קראתי ואני מסכים/ה ל
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  className="mx-0.5 text-purple-400 underline underline-offset-2 hover:text-purple-300 transition">
                  תנאי השימוש
                </a>
                ולמדיניות
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                  className="mx-0.5 text-purple-400 underline underline-offset-2 hover:text-purple-300 transition">
                  הפרטיות
                </a>
                <span className="text-red-400"> *</span>
              </span>
            </label>
          </>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="relative w-full overflow-hidden rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:shadow-xl active:scale-[0.99] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 30px rgba(124,58,237,.4)' }}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {mode === 'login' ? 'מתחבר...' : 'שולח בקשה...'}
            </span>
          ) : (
            mode === 'login' ? 'כניסה לחשבון' : 'שלח בקשת הצטרפות'
          )}
        </button>
      </form>

      {mode === 'login' && (
        <>
          {/* Forgot password */}
          <div className="mt-4">
            {!showForgot ? (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition"
              >
                שכחתי סיסמה
              </button>
            ) : forgotState?.message === 'reset_sent' ? (
              <div className="animate-fade-up rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4 text-center">
                <div className="mb-1 text-xl">📧</div>
                <p className="text-sm font-bold text-emerald-300">מייל לאיפוס נשלח!</p>
                <p className="mt-1 text-xs text-emerald-400/80">בדוק את תיבת הדואר שלך ולחץ על הקישור</p>
              </div>
            ) : (
              <form action={forgotAction} className="animate-fade-up space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-xs font-semibold text-slate-400">הזן את כתובת האימייל שלך ונשלח קישור לאיפוס הסיסמה</p>
                {forgotState?.error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-300">
                    <span>⚠</span>
                    {forgotState.error}
                  </div>
                )}
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="your@email.com"
                  className={fieldCls}
                  dir="ltr"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="flex-1 rounded-xl border border-white/[0.07] py-2 text-xs text-slate-500 transition hover:text-slate-300"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPending}
                    className="flex-1 rounded-xl py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                  >
                    {forgotPending ? 'שולח...' : 'שלח קישור'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-600">
            בהתחברות אתה מסכים ל
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="mx-0.5 text-slate-500 hover:text-slate-300 transition">תנאי השימוש</a>
            ולמדיניות
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="mx-0.5 text-slate-500 hover:text-slate-300 transition">הפרטיות</a>
          </p>
        </>
      )}
    </div>
  )
}
