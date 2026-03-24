'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const CHANGE_TYPES = [
  { value: 'budget', label: 'Budget change', icon: '💰' },
  { value: 'creative', label: 'Creative swap', icon: '🎨' },
  { value: 'audience', label: 'Audience update', icon: '🎯' },
  { value: 'pause', label: 'Campaign pause', icon: '⏸' },
  { value: 'launch', label: 'Campaign launch', icon: '🚀' },
  { value: 'copy', label: 'Copy / messaging', icon: '✏️' },
  { value: 'targeting', label: 'Targeting change', icon: '📍' },
  { value: 'platform', label: 'Platform change', icon: '🔄' },
  { value: 'note', label: 'Note / observation', icon: '📝' },
]

export default function LogChangePage() {
  const router = useRouter()
  const supabase = createClient()

  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    campaign_id: '',
    change_type: '',
    title: '',
    reason: '',
    before_value: '',
    after_value: '',
    expected_impact: '',
    tags: '',
  })

  useEffect(() => {
    async function loadCampaigns() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single()
      if (!profile?.workspace_id) return
      const { data } = await supabase
        .from('campaigns')
        .select('id, name, channel, status')
        .eq('workspace_id', profile.workspace_id)
        .order('name')
      setCampaigns(data || [])
    }
    loadCampaigns()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.campaign_id || !form.change_type || !form.title) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single()

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    const { error: insertError } = await supabase
      .from('change_logs')
      .insert({
        workspace_id: profile?.workspace_id ?? "",
        campaign_id: form.campaign_id,
        created_by: user.id,
        change_type: form.change_type,
        title: form.title,
        reason: form.reason || null,
        before_value: form.before_value || null,
        after_value: form.after_value || null,
        expected_impact: form.expected_impact || null,
        tags,
        outcome: 'pending',
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  const inp = {
    width: '100%', height: 40, border: '1px solid #e4e4e7',
    borderRadius: 8, padding: '0 12px', fontSize: 13,
    fontFamily: 'inherit', color: '#09090b', outline: 'none',
    background: '#fff', transition: 'border-color 0.12s',
  } as any

  const lbl = {
    display: 'block' as const, fontSize: 12,
    fontWeight: 500 as const, color: '#52525b', marginBottom: 6,
  }

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#09090b' }}>Change logged!</div>
        <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Redirecting to dashboard…</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', fontFamily: "'Inter',sans-serif", padding: '32px 20px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box;}select{appearance:auto;}`}</style>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <a href="/dashboard" style={{ fontSize: 12, color: '#a1a1aa', textDecoration: 'none' }}>← Back to dashboard</a>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#09090b', marginTop: 8, marginBottom: 4, letterSpacing: '-0.4px' }}>Log a change</h1>
          <p style={{ fontSize: 13, color: '#71717a' }}>2 minutes now saves hours of confusion later.</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, padding: 24 }}>
          <form onSubmit={handleSubmit}>

            {/* Campaign */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Campaign *</label>
              {campaigns.length === 0 ? (
                <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                  No campaigns yet. <a href="/dashboard/campaigns/new" style={{ color: '#d97706', fontWeight: 500 }}>Create one first →</a>
                </div>
              ) : (
                <select
                  value={form.campaign_id}
                  onChange={e => setForm({ ...form, campaign_id: e.target.value })}
                  required
                  style={{ ...inp, cursor: 'pointer' }}
                >
                  <option value="">Select campaign…</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.channel ? `· ${c.channel}` : ''}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Change type */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Change type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {CHANGE_TYPES.map(t => (
                  <button
                    key={t.value} type="button"
                    onClick={() => setForm({ ...form, change_type: t.value })}
                    style={{
                      padding: '8px 10px', borderRadius: 8, border: '1px solid',
                      borderColor: form.change_type === t.value ? '#4f46e5' : '#e4e4e7',
                      background: form.change_type === t.value ? '#eef2ff' : '#fff',
                      color: form.change_type === t.value ? '#4338ca' : '#52525b',
                      fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left' as const,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>What changed? *</label>
              <input
                style={inp} value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Increased daily budget from ₹40k to ₹65k"
                required
              />
            </div>

            {/* Reason */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Why did you make this change?</label>
              <textarea
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="The reasoning, the data you saw, what triggered this decision…"
                style={{ ...inp, height: 80, padding: '10px 12px', resize: 'vertical' as const, lineHeight: 1.5 }}
              />
            </div>

            {/* Before / After */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Before → After</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 8, alignItems: 'center' }}>
                <input style={inp} value={form.before_value} onChange={e => setForm({ ...form, before_value: e.target.value })} placeholder="Before e.g. ₹40k/day" />
                <div style={{ textAlign: 'center', color: '#a1a1aa', fontSize: 16 }}>→</div>
                <input style={inp} value={form.after_value} onChange={e => setForm({ ...form, after_value: e.target.value })} placeholder="After e.g. ₹65k/day" />
              </div>
            </div>

            {/* Expected impact */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Expected impact</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'positive', label: '↑ Improve', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                  { value: 'negative', label: '↓ Risk / test', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                  { value: 'neutral', label: '↔ Neutral', bg: '#f4f4f5', color: '#52525b', border: '#e4e4e7' },
                ].map(o => (
                  <button
                    key={o.value} type="button"
                    onClick={() => setForm({ ...form, expected_impact: o.value })}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid',
                      borderColor: form.expected_impact === o.value ? o.border : '#e4e4e7',
                      background: form.expected_impact === o.value ? o.bg : '#fff',
                      color: form.expected_impact === o.value ? o.color : '#a1a1aa',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Tags <span style={{ fontWeight: 400, color: '#a1a1aa' }}>(comma separated)</span></label>
              <input
                style={inp} value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g. paid-search, india, cpc, q2"
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#dc2626', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #e4e4e7' }}>
              <a href="/dashboard" style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#52525b', textDecoration: 'none' }}>
                Cancel
              </a>
              <button
                type="submit"
                disabled={loading || !form.campaign_id || !form.change_type || !form.title}
                style={{
                  flex: 2, height: 40, background: '#4f46e5', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  opacity: (loading || !form.campaign_id || !form.change_type || !form.title) ? 0.6 : 1,
                }}
              >
                {loading ? 'Saving…' : 'Save to log →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
