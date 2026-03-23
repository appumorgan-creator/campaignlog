'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
)

// ─── Types ───────────────────────────────────────────────────────────────────
type ChangeLog = {
  id: string
  title: string
  change_type: string
  reason: string | null
  before_value: string | null
  after_value: string | null
  expected_impact: string | null
  outcome: string | null
  outcome_note: string | null
  flagged: boolean
  tags: string[]
  created_at: string
  created_by: string
  campaign_id: string
  campaigns: { name: string; channel: string | null } | null
  profiles: { full_name: string | null; avatar_color: string; avatar_initials: string | null } | null
}

type Campaign = {
  id: string
  name: string
  channel: string | null
  status: string
  health_score: number
}

type Profile = {
  id: string
  full_name: string | null
  marketing_role: string | null
  avatar_color: string
  avatar_initials: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { bg: string; color: string; label: string }> = {
  budget:    { bg: '#fffbeb', color: '#d97706', label: 'Budget' },
  creative:  { bg: '#f5f3ff', color: '#7c3aed', label: 'Creative' },
  audience:  { bg: '#f0fdfa', color: '#0d9488', label: 'Audience' },
  pause:     { bg: '#fef2f2', color: '#dc2626', label: 'Pause' },
  launch:    { bg: '#f0fdf4', color: '#16a34a', label: 'Launch' },
  copy:      { bg: '#fdf4ff', color: '#9333ea', label: 'Copy' },
  targeting: { bg: '#eff6ff', color: '#2563eb', label: 'Targeting' },
  platform:  { bg: '#ecfeff', color: '#0891b2', label: 'Platform' },
  note:      { bg: '#f4f4f5', color: '#71717a', label: 'Note' },
}

const OUTCOME_META: Record<string, { color: string; icon: string; label: string }> = {
  positive: { color: '#16a34a', icon: '↑', label: 'Positive' },
  negative: { color: '#dc2626', icon: '↓', label: 'Negative' },
  neutral:  { color: '#71717a', icon: '↔', label: 'Neutral' },
  pending:  { color: '#d97706', icon: '⏳', label: 'Pending' },
  none:     { color: '#a1a1aa', icon: '—', label: 'No outcome' },
}

const TABS = ['Performance', 'By Campaign', 'Team Activity', 'Change Impact'] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = fn(item)
    ;(acc[key] = acc[key] || []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getLast30Days(): string[] {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

// ─── Shared Chart Options ────────────────────────────────────────────────────
const chartFont = { family: "'Inter', sans-serif", size: 11 }
const gridColor = '#f4f4f5'

// ─── Component ───────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const supabase = createClient()

  const [logs, setLogs] = useState<ChangeLog[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<typeof TABS[number]>('Performance')

  // Table filters
  const [search, setSearch] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [sortField, setSortField] = useState<'created_at' | 'title' | 'change_type' | 'outcome'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const PER_PAGE = 15

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('workspace_id').eq('id', user.id).single()
      if (!profile?.workspace_id) return
      const wid = profile.workspace_id

      const [logsRes, campaignsRes, membersRes] = await Promise.all([
        supabase.from('change_logs')
          .select('*, campaigns(name, channel)')
          .eq('workspace_id', wid)
          .order('created_at', { ascending: false }),
        supabase.from('campaigns')
          .select('id, name, channel, status, health_score')
          .eq('workspace_id', wid)
          .order('name'),
        supabase.from('profiles')
          .select('id, full_name, marketing_role, avatar_color, avatar_initials')
          .eq('workspace_id', wid),
      ])

      setLogs(logsRes.data || [])
      setCampaigns(campaignsRes.data || [])
      setMembers(membersRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // ─── Computed analytics ──────────────────────────────────────────────────
  const outcomeCounts = useMemo(() => {
    const c = { positive: 0, negative: 0, neutral: 0, pending: 0, none: 0 }
    logs.forEach(l => { c[l.outcome as keyof typeof c] = (c[l.outcome as keyof typeof c] || 0) + 1 })
    return c
  }, [logs])

  // Velocity: changes per day over last 30 days
  const velocityData = useMemo(() => {
    const days = getLast30Days()
    const counts = days.map(d => logs.filter(l => l.created_at.slice(0, 10) === d).length)
    return { labels: days.map(d => { const dt = new Date(d); return `${dt.getDate()} ${dt.toLocaleString('en', { month: 'short' })}` }), counts }
  }, [logs])

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const g = groupBy(logs, l => l.change_type)
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length)
  }, [logs])

  // Campaign stats
  const campaignStats = useMemo(() => {
    return campaigns.map(c => {
      const cLogs = logs.filter(l => l.campaign_id === c.id)
      const positive = cLogs.filter(l => l.outcome === 'positive').length
      const negative = cLogs.filter(l => l.outcome === 'negative').length
      return { ...c, totalChanges: cLogs.length, positive, negative }
    }).sort((a, b) => b.totalChanges - a.totalChanges)
  }, [campaigns, logs])

  // Team stats
  const teamStats = useMemo(() => {
    return members.map(m => {
      const mLogs = logs.filter(l => l.created_by === m.id)
      const positive = mLogs.filter(l => l.outcome === 'positive').length
      const lastActive = mLogs.length > 0 ? mLogs[0].created_at : null
      const types = groupBy(mLogs, l => l.change_type)
      const topType = Object.entries(types).sort((a, b) => b[1].length - a[1].length)[0]
      return { ...m, totalChanges: mLogs.length, positive, lastActive, topType: topType?.[0] || null }
    }).sort((a, b) => b.totalChanges - a.totalChanges)
  }, [members, logs])

  // Impact by type
  const impactData = useMemo(() => {
    const types = Object.keys(TYPE_META)
    return types.map(t => {
      const tLogs = logs.filter(l => l.change_type === t)
      return {
        type: t,
        positive: tLogs.filter(l => l.outcome === 'positive').length,
        negative: tLogs.filter(l => l.outcome === 'negative').length,
        pending: tLogs.filter(l => l.outcome === 'pending').length,
        neutral: tLogs.filter(l => l.outcome === 'neutral').length,
        total: tLogs.length,
        successRate: tLogs.length > 0 ? Math.round(tLogs.filter(l => l.outcome === 'positive').length / tLogs.length * 100) : 0,
      }
    }).filter(t => t.total > 0).sort((a, b) => b.total - a.total)
  }, [logs])

  // ─── Table filtering / sorting / pagination ──────────────────────────────
  const filteredLogs = useMemo(() => {
    let result = [...logs]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(s) ||
        l.campaigns?.name?.toLowerCase().includes(s) ||
        l.profiles?.full_name?.toLowerCase().includes(s) ||
        l.tags?.some(t => t.toLowerCase().includes(s))
      )
    }
    if (filterCampaign) result = result.filter(l => l.campaign_id === filterCampaign)
    if (filterType) result = result.filter(l => l.change_type === filterType)
    if (filterOutcome) result = result.filter(l => l.outcome === filterOutcome)
    if (filterMember) result = result.filter(l => l.created_by === filterMember)

    result.sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [logs, search, filterCampaign, filterType, filterOutcome, filterMember, sortField, sortDir])

  const totalPages = Math.ceil(filteredLogs.length / PER_PAGE)
  const paginatedLogs = filteredLogs.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(1)
  }

  // ─── Styles ──────────────────────────────────────────────────────────────
  const card = { background: '#fff', border: '1px solid #e4e4e7', borderRadius: 10, padding: 20 } as const
  const inp = { height: 34, border: '1px solid #e4e4e7', borderRadius: 7, padding: '0 10px', fontSize: 12, fontFamily: 'inherit', color: '#09090b', outline: 'none', background: '#fff' } as const
  const sortIcon = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ fontSize: 13, color: '#a1a1aa' }}>Loading analytics…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', fontFamily: "'Inter',sans-serif", padding: '32px 20px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box;}select{appearance:auto;}`}</style>

      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <a href="/dashboard" style={{ fontSize: 12, color: '#a1a1aa', textDecoration: 'none' }}>← Back to dashboard</a>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#09090b', marginTop: 8, marginBottom: 4, letterSpacing: '-0.4px' }}>Analytics</h1>
            <p style={{ fontSize: 13, color: '#71717a' }}>{logs.length} changes across {campaigns.length} campaigns</p>
          </div>
          <a href="/dashboard/log" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 16px', height: 36, background: '#4f46e5', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            + Log change
          </a>
        </div>

        {/* ── Summary bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Total', value: logs.length, color: '#09090b' },
            { label: 'Positive', value: outcomeCounts.positive, color: '#16a34a' },
            { label: 'Pending', value: outcomeCounts.pending, color: '#d97706' },
            { label: 'Negative', value: outcomeCounts.negative, color: '#dc2626' },
            { label: 'No outcome', value: outcomeCounts.none + outcomeCounts.neutral, color: '#a1a1aa' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#f4f4f5', borderRadius: 8, padding: 3 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 500,
              fontFamily: 'inherit', cursor: 'pointer', border: 'none', borderRadius: 6,
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#09090b' : '#71717a',
              boxShadow: tab === t ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s',
            }}>{t}</button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ marginBottom: 32 }}>

          {/* Performance Tab */}
          {tab === 'Performance' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              {/* Velocity chart */}
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#09090b', marginBottom: 16 }}>Change velocity — last 30 days</div>
                <div style={{ height: 220 }}>
                  <Line
                    data={{
                      labels: velocityData.labels,
                      datasets: [{
                        data: velocityData.counts,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79,70,229,0.06)',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        fill: true,
                        tension: 0.3,
                      }],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { bodyFont: chartFont, titleFont: chartFont } },
                      scales: {
                        x: { grid: { display: false }, ticks: { font: chartFont, color: '#a1a1aa', maxRotation: 0, maxTicksLimit: 8 } },
                        y: { grid: { color: gridColor }, ticks: { font: chartFont, color: '#a1a1aa', stepSize: 1 }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Type breakdown donut */}
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#09090b', marginBottom: 16 }}>By change type</div>
                <div style={{ height: 160, display: 'flex', justifyContent: 'center' }}>
                  <Doughnut
                    data={{
                      labels: typeBreakdown.map(([t]) => TYPE_META[t]?.label || t),
                      datasets: [{
                        data: typeBreakdown.map(([, items]) => items.length),
                        backgroundColor: typeBreakdown.map(([t]) => TYPE_META[t]?.color || '#a1a1aa'),
                        borderWidth: 0,
                      }],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false, cutout: '65%',
                      plugins: { legend: { display: false }, tooltip: { bodyFont: chartFont } },
                    }}
                  />
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                  {typeBreakdown.map(([t, items]) => {
                    const m = TYPE_META[t]
                    return (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: m?.color || '#a1a1aa' }} />
                        <span style={{ color: '#52525b' }}>{m?.label || t}</span>
                        <span style={{ color: '#a1a1aa' }}>{items.length}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* By Campaign Tab */}
          {tab === 'By Campaign' && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#09090b', marginBottom: 16 }}>Changes per campaign</div>
              {campaignStats.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#a1a1aa', fontSize: 12 }}>No campaigns yet.</div>
              ) : (
                <>
                  <div style={{ height: Math.max(180, campaignStats.length * 40) }}>
                    <Bar
                      data={{
                        labels: campaignStats.map(c => c.name.length > 28 ? c.name.slice(0, 28) + '…' : c.name),
                        datasets: [
                          { label: 'Positive', data: campaignStats.map(c => c.positive), backgroundColor: '#16a34a', borderRadius: 3 },
                          { label: 'Other', data: campaignStats.map(c => c.totalChanges - c.positive - c.negative), backgroundColor: '#e4e4e7', borderRadius: 3 },
                          { label: 'Negative', data: campaignStats.map(c => c.negative), backgroundColor: '#fca5a5', borderRadius: 3 },
                        ],
                      }}
                      options={{
                        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                        plugins: { legend: { labels: { font: chartFont, usePointStyle: true, pointStyle: 'circle', padding: 16 }, position: 'top' }, tooltip: { bodyFont: chartFont } },
                        scales: {
                          x: { stacked: true, grid: { color: gridColor }, ticks: { font: chartFont, color: '#a1a1aa', stepSize: 1 } },
                          y: { stacked: true, grid: { display: false }, ticks: { font: chartFont, color: '#52525b' } },
                        },
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {campaignStats.map(c => (
                      <div key={c.id} style={{ padding: '10px 12px', background: '#f9f9f9', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.status === 'active' ? '#22c55e' : '#a1a1aa', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: '#a1a1aa' }}>{c.totalChanges} changes · Health {c.health_score}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Team Activity Tab */}
          {tab === 'Team Activity' && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#09090b', marginBottom: 16 }}>Team members</div>
              {teamStats.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#a1a1aa', fontSize: 12 }}>No team members yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {teamStats.map(m => {
                    const t = m.topType ? TYPE_META[m.topType] : null
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f9f9f9', borderRadius: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: m.avatar_color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0,
                        }}>
                          {m.avatar_initials || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#09090b' }}>{m.full_name || 'Unknown'}</div>
                          <div style={{ fontSize: 11, color: '#a1a1aa' }}>{m.marketing_role || 'Member'}</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: 60 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#09090b', lineHeight: 1 }}>{m.totalChanges}</div>
                          <div style={{ fontSize: 10, color: '#a1a1aa' }}>changes</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: 50 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#16a34a', lineHeight: 1 }}>{m.positive}</div>
                          <div style={{ fontSize: 10, color: '#a1a1aa' }}>positive</div>
                        </div>
                        {t && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: t.bg, color: t.color, textTransform: 'uppercase', letterSpacing: '.3px' }}>
                            {t.label}
                          </span>
                        )}
                        <div style={{ fontSize: 10, color: '#a1a1aa', minWidth: 60, textAlign: 'right' }}>
                          {m.lastActive ? formatDate(m.lastActive) : 'Never'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Change Impact Tab */}
          {tab === 'Change Impact' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#09090b', marginBottom: 16 }}>Outcome by change type</div>
                <div style={{ height: 240 }}>
                  <Bar
                    data={{
                      labels: impactData.map(d => TYPE_META[d.type]?.label || d.type),
                      datasets: [
                        { label: 'Positive', data: impactData.map(d => d.positive), backgroundColor: '#16a34a', borderRadius: 3 },
                        { label: 'Pending', data: impactData.map(d => d.pending), backgroundColor: '#fbbf24', borderRadius: 3 },
                        { label: 'Negative', data: impactData.map(d => d.negative), backgroundColor: '#f87171', borderRadius: 3 },
                        { label: 'Neutral', data: impactData.map(d => d.neutral), backgroundColor: '#d4d4d8', borderRadius: 3 },
                      ],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { labels: { font: chartFont, usePointStyle: true, pointStyle: 'circle', padding: 14 }, position: 'top' }, tooltip: { bodyFont: chartFont } },
                      scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { font: chartFont, color: '#52525b' } },
                        y: { stacked: true, grid: { color: gridColor }, ticks: { font: chartFont, color: '#a1a1aa', stepSize: 1 }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>

              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#09090b', marginBottom: 16 }}>Success rate by type</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  {impactData.map(d => {
                    const m = TYPE_META[d.type]
                    return (
                      <div key={d.type}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#09090b' }}>{m?.label || d.type}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: d.successRate >= 60 ? '#16a34a' : d.successRate >= 30 ? '#d97706' : '#dc2626' }}>
                            {d.successRate}%
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#f4f4f5', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3, transition: 'width 0.5s',
                            width: `${d.successRate}%`,
                            background: d.successRate >= 60 ? '#16a34a' : d.successRate >= 30 ? '#d97706' : '#dc2626',
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#a1a1aa', marginTop: 2 }}>
                          {d.positive} positive, {d.negative} negative out of {d.total} changes
                        </div>
                      </div>
                    )
                  })}
                  {impactData.length === 0 && (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#a1a1aa', fontSize: 12 }}>
                      Log changes with outcomes to see impact data.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Detailed Change Log Table ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#09090b' }}>Detailed change log</div>
            <div style={{ fontSize: 11, color: '#a1a1aa' }}>
              {filteredLogs.length} of {logs.length} changes
            </div>
          </div>

          {/* Filters row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input
              type="text" placeholder="Search changes…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ ...inp, width: 200 }}
            />
            <select value={filterCampaign} onChange={e => { setFilterCampaign(e.target.value); setPage(1) }} style={{ ...inp, width: 170, cursor: 'pointer' }}>
              <option value="">All campaigns</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }} style={{ ...inp, width: 140, cursor: 'pointer' }}>
              <option value="">All types</option>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterOutcome} onChange={e => { setFilterOutcome(e.target.value); setPage(1) }} style={{ ...inp, width: 130, cursor: 'pointer' }}>
              <option value="">All outcomes</option>
              {Object.entries(OUTCOME_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterMember} onChange={e => { setFilterMember(e.target.value); setPage(1) }} style={{ ...inp, width: 150, cursor: 'pointer' }}>
              <option value="">All members</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name || 'Unknown'}</option>)}
            </select>
            {(search || filterCampaign || filterType || filterOutcome || filterMember) && (
              <button onClick={() => { setSearch(''); setFilterCampaign(''); setFilterType(''); setFilterOutcome(''); setFilterMember(''); setPage(1) }}
                style={{ ...inp, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', paddingLeft: 12, paddingRight: 12 }}>
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                  {[
                    { key: 'created_at' as const, label: 'Date', w: 80 },
                    { key: 'change_type' as const, label: 'Type', w: 80 },
                    { key: 'title' as const, label: 'Change', w: undefined },
                    { key: 'outcome' as const, label: 'Outcome', w: 90 },
                  ].map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)} style={{
                      padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#71717a',
                      fontSize: 11, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                      width: col.w,
                    }}>
                      {col.label}{sortIcon(col.key)}
                    </th>
                  ))}
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#71717a', fontSize: 11, width: 100 }}>Campaign</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#71717a', fontSize: 11, width: 90 }}>By</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 500, color: '#71717a', fontSize: 11, width: 30 }}>🚩</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px 10px', textAlign: 'center', color: '#a1a1aa' }}>
                      {logs.length === 0 ? 'No changes logged yet.' : 'No changes match your filters.'}
                    </td>
                  </tr>
                ) : paginatedLogs.map(log => {
                  const tm = TYPE_META[log.change_type] || TYPE_META.note
                  const om = OUTCOME_META[log.outcome || 'none'] || OUTCOME_META.none
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                      <td style={{ padding: '10px 10px', color: '#71717a', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: tm.bg, color: tm.color, textTransform: 'uppercase', letterSpacing: '.3px' }}>
                          {tm.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 500, color: '#09090b', lineHeight: 1.4 }}>{log.title}</div>
                        {(log.before_value || log.after_value) && (
                          <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>
                            {log.before_value} → {log.after_value}
                          </div>
                        )}
                        {log.tags && log.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {log.tags.map(tag => (
                              <span key={tag} style={{ fontSize: 9, color: '#71717a', background: '#f4f4f5', padding: '1px 6px', borderRadius: 3, border: '1px solid #e4e4e7' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: om.color }}>{om.icon} {om.label}</span>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#52525b', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.campaigns?.name || '—'}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', background: log.profiles?.avatar_color || '#a1a1aa',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 600, color: '#fff', flexShrink: 0,
                          }}>
                            {log.profiles?.avatar_initials || '?'}
                          </div>
                          <span style={{ color: '#52525b', whiteSpace: 'nowrap', fontSize: 11 }}>{log.profiles?.full_name?.split(' ')[0] || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        {log.flagged && <span title="Flagged for review" style={{ fontSize: 12 }}>🚩</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid #f4f4f5' }}>
              <div style={{ fontSize: 11, color: '#a1a1aa' }}>
                Page {page} of {totalPages}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ ...inp, width: 32, padding: 0, textAlign: 'center', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily: 'inherit' }}
                >←</button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ ...inp, width: 32, padding: 0, textAlign: 'center', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontFamily: 'inherit' }}
                >→</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
