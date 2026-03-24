'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9f9f9', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ width:'100%', maxWidth:400, padding:'0 20px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:40, height:40, background:'#4f46e5', borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <svg width="18" height="18" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M6 1v10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontSize:20, fontWeight:600, color:'#09090b', letterSpacing:'-0.4px' }}>CampaignLog</div>
          <div style={{ fontSize:13, color:'#a1a1aa', marginTop:4 }}>Sign in to your workspace</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e4e4e7', borderRadius:12, padding:'28px' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#52525b', marginBottom:6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={{ width:'100%', height:38, border:'1px solid #e4e4e7', borderRadius:7, padding:'0 11px', fontSize:13, fontFamily:'inherit', color:'#09090b', outline:'none' }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#52525b', marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ width:'100%', height:38, border:'1px solid #e4e4e7', borderRadius:7, padding:'0 11px', fontSize:13, fontFamily:'inherit', color:'#09090b', outline:'none' }} />
            </div>
            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, padding:'8px 11px', fontSize:12, color:'#dc2626', marginBottom:12 }}>{error}</div>}
            <button type="submit" disabled={loading || !email || !password} style={{ width:'100%', height:38, background:'#4f46e5', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', opacity:(loading||!email||!password)?0.6:1 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
