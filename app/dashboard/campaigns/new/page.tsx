'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const CHANNELS = [
  'Google Ads', 'Meta Ads', 'LinkedIn Ads',
  'HubSpot Email', 'Organic / SEO', 'YouTube',
  'Twitter / X Ads', 'Programmatic', 'Influencer',
  'WhatsApp', 'SMS', 'Other',
]

export default function NewCampaignPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', channel: '', status: 'active',
    start_date: '', end_date: '',
    budget_daily: '', budget_currency: 'INR', goal: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles').select('workspace_id').eq('id', user.id).single()

    const { error: insertError } = await supabase
      .from('campaigns')
      .insert({
        workspace_id: profile.workspace_id,
        created_by: user.id,
        name: form.name,
        channel: form.channel || null,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget_daily: form.budget_daily ? parseFloat(form.budget_daily) : null,
        budget_currency: form.budget_currency,
        goal: form.goal || null,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const inp = {
    width: '100%', height: 40, border: '1px solid #e4e4e7',
    borderRadius: 8, padding: '0 12px', fontSize: 13,
    fontFamily: 'inherit', color: '#09090b', outline: 'none', background: '#fff',
  } as any

  const lbl = { display: 'block' as const, fontSize: 12, fontWeight: 500 as const, color: '#52525b', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', fontFamily: "'Inter',sans-serif", padding: '32px 20px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box;}select{appearance:auto;}`}</style>

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <a href="/dashboard" style={{ fontSize: 12, color: '#a1a1aa', textDecoration: 'none' }}>← Back to dashboard</a>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#09090b', marginTop: 8, marginBottom: 4, letterSpacing: '-0.4px' }}>New campaign</h1>
          <p style={{ fontSize: 13, color: '#71717a' }}>Add a campaign to start logging changes against it.</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, padding: 24 }}>
          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Campaign name *</label>
              <input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Q2 Brand Awareness" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Channel</label>
                <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">Select channel…</option>
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Start date</label>
                <input type="date" style={inp} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>End date</label>
                <input type="date" style={inp} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Daily budget</label>
                <input type="number" style={inp} value={form.budget_daily} onChange={e => setForm({ ...form, budget_daily: e.target.value })} placeholder="e.g. 40000" />
              </div>
              <div>
                <label style={lbl}>Currency</label>
                <select value={form.budget_currency} onChange={e => setForm({ ...form, budget_currency: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Campaign goal</label>
              <textarea
                value={form.goal}
                onChange={e => setForm({ ...form, goal: e.target.value })}
                placeholder="e.g. Generate 200 MQLs in Q2 with CPL under ₹420"
                style={{ ...inp, height: 72, padding: '10px 12px', resize: 'vertical' as const, lineHeight: 1.5 }}
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
                type="submit" disabled={loading || !form.name}
                style={{ flex: 2, height: 40, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: (loading || !form.name) ? 0.6 : 1 }}
              >
                {loading ? 'Creating…' : 'Create campaign →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
