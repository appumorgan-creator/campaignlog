export const dynamic = "force-dynamic"

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChangelogPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user.id).single()
  if (!profile?.workspace_id) redirect('/onboarding')

  const { data: logs } = await supabase
    .from('change_logs')
    .select('*, campaigns(name, channel)')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })

  const typeColors: any = {
    budget:    { bg: '#fffbeb', color: '#d97706', label: 'Budget' },
    creative:  { bg: '#f5f3ff', color: '#7c3aed', label: 'Creative' },
    audience:  { bg: '#f0fdfa', color: '#0d9488', label: 'Audience' },
    pause:     { bg: '#fef2f2', color: '#dc2626', label: 'Pause' },
    launch:    { bg: '#f0fdf4', color: '#16a34a', label: 'Launch' },
    copy:      { bg: '#fdf4ff', color: '#9333ea', label: 'Copy' },
    targeting: { bg: '#eff6ff', color: '#2563eb', label: 'Targeting' },
    platform:  { bg: '#f0fdf4', color: '#0891b2', label: 'Platform' },
    note:      { bg: '#f4f4f5', color: '#71717a', label: 'Note' },
  }

  const outcomeStyle: any = {
    positive: { color: '#16a34a', icon: '↑' },
    negative: { color: '#dc2626', icon: '↓' },
    neutral:  { color: '#71717a', icon: '↔' },
    pending:  { color: '#d97706', icon: '⏳' },
    none:     { color: '#a1a1aa', icon: '—' },
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f9f9f9', fontFamily:"'Inter',sans-serif", padding:'32px 20px' }}>
      <div style={{ maxWidth:740, margin:'0 auto' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <a href="/dashboard" style={{ fontSize:12, color:'#a1a1aa', textDecoration:'none' }}>← Back to dashboard</a>
            <h1 style={{ fontSize:20, fontWeight:600, color:'#09090b', marginTop:8, marginBottom:4, letterSpacing:'-0.4px' }}>Change log</h1>
            <p style={{ fontSize:13, color:'#71717a' }}>{logs?.length || 0} changes logged</p>
          </div>
          <a href="/dashboard/log" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0 16px', height:38, background:'#4f46e5', color:'#fff', borderRadius:8, fontSize:13, fontWeight:500, textDecoration:'none' }}>
            + Log change
          </a>
        </div>

        {!logs || logs.length === 0 ? (
          <div style={{ background:'#fff', border:'1px solid #e4e4e7', borderRadius:12, padding:'48px 24px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#09090b', marginBottom:6 }}>No changes logged yet</div>
            <div style={{ fontSize:13, color:'#a1a1aa', marginBottom:20 }}>Start documenting your campaign decisions.</div>
            <a href="/dashboard/log" style={{ display:'inline-flex', padding:'8px 20px', background:'#4f46e5', color:'#fff', borderRadius:8, fontSize:13, fontWeight:500, textDecoration:'none' }}>
              Log your first change →
            </a>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {logs.map((log: any) => {
              const t = typeColors[log.change_type] || typeColors.note
              const o = outcomeStyle[log.outcome] || outcomeStyle.none
              const date = new Date(log.created_at)
              return (
                <div key={log.id} style={{ background:'#fff', border:'1px solid #e4e4e7', borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10, background:t.bg, color:t.color, flexShrink:0, marginTop:2, textTransform:'uppercase', letterSpacing:'.3px' }}>
                      {t.label}
                    </span>
                    <span style={{ fontSize:13, fontWeight:500, color:'#09090b', flex:1, lineHeight:1.4 }}>{log.title}</span>
                    <span style={{ fontSize:10, color:'#a1a1aa', whiteSpace:'nowrap' }}>
                      {date.toLocaleDateString('en-IN', { day:'numeric', month:'short' })} · {date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>

                  {log.reason && (
                    <div style={{ fontSize:12, color:'#52525b', lineHeight:1.5, marginBottom:8 }}>{log.reason}</div>
                  )}

                  {(log.before_value || log.after_value) && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:12 }}>
                      <span style={{ color:'#a1a1aa', background:'#f4f4f5', padding:'2px 8px', borderRadius:4 }}>{log.before_value}</span>
                      <span style={{ color:'#a1a1aa' }}>→</span>
                      <span style={{ color:'#09090b', fontWeight:500, background:'#f4f4f5', padding:'2px 8px', borderRadius:4 }}>{log.after_value}</span>
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'#a1a1aa' }}>{log.campaigns?.name}</span>
                    {log.tags?.map((tag: string) => (
                      <span key={tag} style={{ fontSize:10, color:'#71717a', background:'#f4f4f5', padding:'2px 7px', borderRadius:4, border:'1px solid #e4e4e7' }}>{tag}</span>
                    ))}
                    <span style={{ marginLeft:'auto', fontSize:11, fontWeight:500, color:o.color }}>{o.icon} {log.outcome || 'pending'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
