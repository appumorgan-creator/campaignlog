'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const supabase = createClient()

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
      },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f9f9f9',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box;}`}</style>

      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, background: '#4f46e5', borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <svg width="18" height="18" viewBox="0 0 12 12" fill="none">
              <path d="M1 6h10M6 1v10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#09090b', letterSpacing: '-0.4px' }}>
            CampaignLog
          </div>
          <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>
            Sign in to your workspace
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', border: '1px solid #e4e4e7',
          borderRadius: 12, padding: '28px 28px',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#09090b', marginBottom: 6 }}>
                Check your email
              </div>
              <div style={{ fontSize: 13, color: '#71717a', lineHeight: 1.5 }}>
                We sent a magic link to <strong>{email}</strong>.<br/>
                Click it to sign in — no password needed.
              </div>
              <button
                onClick={() => setSent(false)}
                style={{
                  marginTop: 20, fontSize: 12, color: '#4f46e5',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                style={{
                  width: '100%', height: 40, border: '1px solid #e4e4e7',
                  borderRadius: 8, background: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontSize: 13, fontWeight: 500, color: '#09090b',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  opacity: googleLoading ? 0.7 : 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Signing in…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                margin: '18px 0', color: '#a1a1aa', fontSize: 12,
              }}>
                <div style={{ flex: 1, height: 1, background: '#e4e4e7' }} />
                or continue with email
                <div style={{ flex: 1, height: 1, background: '#e4e4e7' }} />
              </div>

              {/* Magic link form */}
              <form onSubmit={handleMagicLink}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{
                    display: 'block', fontSize: 12, fontWeight: 500,
                    color: '#52525b', marginBottom: 6,
                  }}>
                    Work email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    style={{
                      width: '100%', height: 38, border: '1px solid #e4e4e7',
                      borderRadius: 7, padding: '0 11px', fontSize: 13,
                      fontFamily: 'inherit', color: '#09090b', outline: 'none',
                      transition: 'border-color 0.12s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#4f46e5'}
                    onBlur={e => e.target.style.borderColor = '#e4e4e7'}
                  />
                </div>

                {error && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 6, padding: '8px 11px',
                    fontSize: 12, color: '#dc2626', marginBottom: 12,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  style={{
                    width: '100%', height: 38, background: '#4f46e5',
                    color: '#fff', border: 'none', borderRadius: 7,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.12s',
                    opacity: loading || !email ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Sending link…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#a1a1aa', marginTop: 20, lineHeight: 1.5 }}>
          By signing in you agree to our{' '}
          <a href="/terms" style={{ color: '#4f46e5', textDecoration: 'none' }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: '#4f46e5', textDecoration: 'none' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
