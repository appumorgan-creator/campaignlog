'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const MARKETING_ROLES = [
  'Marketing Ops', 'Paid Media', 'Creative Lead',
  'Email & CRM', 'SEO / Content', 'Social Media',
  'Brand', 'Growth', 'CMO / Head of Marketing', 'Other',
]

const AVATAR_COLORS = [
  '#4f46e5','#0d9488','#d97706','#dc2626',
  '#16a34a','#7c3aed','#0ea5e9','#db2777',
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [workspaceName, setWorkspaceName] = useState('')
  const [fullName, setFullName] = useState('')
  const [marketingRole, setMarketingRole] = useState('')
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceName || !fullName || !marketingRole) return
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Create workspace
      const slug = slugify(workspaceName) + '-' + Math.random().toString(36).slice(2, 6)
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({ name: workspaceName, slug })
        .select()
        .single()

      if (wsError) throw wsError

      // 2. Update profile
      const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          workspace_id: workspace.id,
          full_name: fullName,
          marketing_role: marketingRole,
          avatar_color: avatarColor,
          avatar_initials: initials,
          role: 'admin',
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', height: 40, border: '1px solid #e4e4e7',
    borderRadius: 8, padding: '0 12px', fontSize: 13,
    fontFamily: 'inherit', color: '#09090b', outline: 'none',
    background: '#fff',
  }

  const labelStyle = {
    display: 'block' as const, fontSize: 12, fontWeight: 500 as const,
    color: '#52525b', marginBottom: 6,
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f9f9f9',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box;}`}</style>

      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, background: '#4f46e5', borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 12 12" fill="none">
              <path d="M1 6h10M6 1v10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#09090b' }}>Set up your workspace</div>
          <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>Takes 60 seconds. No credit card needed.</div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              height: 3, width: 40, borderRadius: 2,
              background: step >= s ? '#4f46e5' : '#e4e4e7',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        <div style={{
          background: '#fff', border: '1px solid #e4e4e7',
          borderRadius: 12, padding: '28px',
        }}>
          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if(workspaceName && fullName) setStep(2) } : handleSubmit}>

            {step === 1 && (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#09090b', marginBottom: 4 }}>
                  About your team
                </div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 20 }}>
                  This creates your team workspace in CampaignLog.
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Workspace name</label>
                  <input
                    style={inputStyle}
                    value={workspaceName}
                    onChange={e => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Marketing Team"
                    required
                  />
                  <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                    Usually your company or team name
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Your full name</label>
                  <input
                    style={inputStyle}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Appu Kumar"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={!workspaceName || !fullName}
                  style={{
                    width: '100%', height: 40, background: '#4f46e5',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'inherit', opacity: (!workspaceName || !fullName) ? 0.6 : 1,
                  }}
                >
                  Continue →
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#09090b', marginBottom: 4 }}>
                  Your marketing role
                </div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 20 }}>
                  Helps teammates know your context when you log changes.
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>What best describes your role?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {MARKETING_ROLES.map(r => (
                      <button
                        key={r} type="button"
                        onClick={() => setMarketingRole(r)}
                        style={{
                          padding: '8px 12px', borderRadius: 7, border: '1px solid',
                          borderColor: marketingRole === r ? '#4f46e5' : '#e4e4e7',
                          background: marketingRole === r ? '#eef2ff' : '#fff',
                          color: marketingRole === r ? '#4338ca' : '#52525b',
                          fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          fontFamily: 'inherit', textAlign: 'left' as const,
                          transition: 'all 0.12s',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Pick your avatar colour</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {AVATAR_COLORS.map(c => (
                      <div
                        key={c}
                        onClick={() => setAvatarColor(c)}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: c,
                          cursor: 'pointer',
                          outline: avatarColor === c ? `3px solid ${c}` : 'none',
                          outlineOffset: 2,
                          transition: 'outline 0.12s',
                        }}
                      />
                    ))}
                  </div>
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

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button" onClick={() => setStep(1)}
                    style={{
                      flex: 1, height: 40, background: 'none',
                      border: '1px solid #e4e4e7', borderRadius: 8,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'inherit', color: '#52525b',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !marketingRole}
                    style={{
                      flex: 2, height: 40, background: '#4f46e5',
                      color: '#fff', border: 'none', borderRadius: 8,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'inherit',
                      opacity: (loading || !marketingRole) ? 0.6 : 1,
                    }}
                  >
                    {loading ? 'Creating workspace…' : 'Create workspace →'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
