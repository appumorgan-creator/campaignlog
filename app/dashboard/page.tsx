export const dynamic = "force-dynamic"

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, workspaces(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) redirect('/onboarding')
  const wid = profile.workspace_id

  const [
    { count: totalChanges },
    { count: activeCampaigns },
    { count: teamMembers },
    { count: flaggedItems },
    { data: recentChanges },
    { data: campaigns },
  ] = await Promise.all([
    supabase.from('change_logs').select('*', { count: 'exact', head: true }).eq('workspace_id', wid),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('workspace_id', wid).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('workspace_id', wid),
    supabase.from('change_logs').select('*', { count: 'exact', head: true }).eq('workspace_id', wid).eq('flagged', true),
    supabase.from('change_logs')
      .select('*, campaigns(name)')
      .eq('workspace_id', wid)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('campaigns')
      .select('*')
      .eq('workspace_id', wid)
      .order('updated_at', { ascending: false })
      .limit(6),
  ])

  const ws = (profile as any).workspaces
  const typeIcons: Record<string, string> = {
    budget:'💰', creative:'🎨', audience:'🎯', pause:'⏸',
    launch:'🚀', copy:'✏️', targeting:'📍', platform:'🔄', note:'📝'
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div style={{ padding:'36px 32px', animation:'fadeIn .4s ease' }}>
      <div style={{ maxWidth:960, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom:32, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:700, color:'var(--color-text)', letterSpacing:'-0.03em', marginBottom:4, fontFamily:'var(--font-display)' }}>
              {greeting}, {profile.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p style={{ fontSize:14, color:'var(--color-text-secondary)', fontFamily:'var(--font-body)' }}>
              {ws?.name} · {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
            </p>
          </div>
          <a href="/dashboard/log" style={{
            display:'inline-flex', alignItems:'center', gap:7, padding:'0 20px', height:40,
            background:'var(--color-primary)', color:'#fff', borderRadius:'var(--radius)',
            fontSize:13, fontWeight:600, textDecoration:'none', fontFamily:'var(--font-display)',
            letterSpacing:'-0.01em', transition:'background .15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>
            Log change
          </a>
        </div>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total changes', value: totalChanges ?? 0, sub:'All time', color:'var(--color-text)' },
            { label:'Active campaigns', value: activeCampaigns ?? 0, sub:'Running now', color:'var(--color-primary-light)' },
            { label:'Team members', value: teamMembers ?? 0, sub:'In workspace', color:'var(--color-text)' },
            { label:'Flagged', value: flaggedItems ?? 0, sub:'Need review', color: (flaggedItems ?? 0) > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' },
          ].map((k, i) => (
            <div key={k.label} style={{
              background:'var(--color-bg-card)', border:'1px solid var(--color-border)',
              borderRadius:'var(--radius-lg)', padding:'18px 20px',
              animation:'fadeIn .4s ease', animationDelay:`${i * 60}ms`, animationFillMode:'both',
            }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8, fontFamily:'var(--font-display)' }}>
                {k.label}
              </div>
              <div style={{ fontSize:28, fontWeight:700, color:k.color, lineHeight:1, marginBottom:4, letterSpacing:'-0.03em', fontFamily:'var(--font-display)' }}>
                {k.value}
              </div>
              <div style={{ fontSize:12, color:'var(--color-text-muted)', fontFamily:'var(--font-body)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Recent activity */}
          <div style={{
            background:'var(--color-bg-card)', border:'1px solid var(--color-border)',
            borderRadius:'var(--radius-lg)', padding:'20px',
            animation:'fadeIn .4s ease', animationDelay:'250ms', animationFillMode:'both',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:'var(--color-text)', fontFamily:'var(--font-display)', letterSpacing:'-0.01em' }}>Recent activity</h3>
              <a href="/dashboard/changelog" style={{ fontSize:12, color:'var(--color-primary-light)', textDecoration:'none', fontWeight:500, fontFamily:'var(--font-body)' }}>View all →</a>
            </div>
            {recentChanges && recentChanges.length > 0 ? (
              recentChanges.map((log: any, i: number) => (
                <div key={log.id} style={{
                  display:'flex', gap:12, padding:'10px 0',
                  borderBottom: i < recentChanges.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                }}>
                  <div style={{
                    width:32, height:32, borderRadius:8, background:'var(--color-bg-badge)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14,
                  }}>
                    {typeIcons[log.change_type] || '📝'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:'var(--color-text)', fontWeight:500, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'var(--font-body)' }}>
                      {log.title}
                    </div>
                    <div style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:3, fontFamily:'var(--font-mono)', fontWeight:400 }}>
                      {log.campaigns?.name} · {new Date(log.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign:'center', padding:'28px 0', color:'var(--color-text-muted)', fontSize:13 }}>
                No changes yet. <a href="/dashboard/log" style={{ color:'var(--color-primary-light)', textDecoration:'none', fontWeight:500 }}>Log your first →</a>
              </div>
            )}
          </div>

          {/* Campaigns */}
          <div style={{
            background:'var(--color-bg-card)', border:'1px solid var(--color-border)',
            borderRadius:'var(--radius-lg)', padding:'20px',
            animation:'fadeIn .4s ease', animationDelay:'300ms', animationFillMode:'both',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:'var(--color-text)', fontFamily:'var(--font-display)', letterSpacing:'-0.01em' }}>Campaigns</h3>
              <a href="/dashboard/campaigns/new" style={{ fontSize:12, color:'var(--color-primary-light)', textDecoration:'none', fontWeight:500, fontFamily:'var(--font-body)' }}>+ New →</a>
            </div>
            {campaigns && campaigns.length > 0 ? (
              campaigns.map((c: any, i: number) => (
                <div key={c.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 0',
                  borderBottom: i < campaigns.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                }}>
                  <div style={{
                    width:9, height:9, borderRadius:'50%', flexShrink:0,
                    background: c.status === 'active' ? 'var(--color-success)' : c.status === 'paused' ? 'var(--color-text-muted)' : 'var(--color-warning)',
                  }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--color-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'var(--font-body)' }}>{c.name}</div>
                    <div style={{ fontSize:11, color:'var(--color-text-muted)', fontFamily:'var(--font-mono)' }}>{c.channel || 'No channel'}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:10, color:'var(--color-text-muted)', fontFamily:'var(--font-display)', textTransform:'uppercase', letterSpacing:'.04em' }}>Health</div>
                    <div style={{
                      fontSize:14, fontWeight:700, fontFamily:'var(--font-display)', letterSpacing:'-0.02em',
                      color: c.health_score > 70 ? 'var(--color-success)' : c.health_score > 40 ? 'var(--color-warning)' : 'var(--color-danger)',
                    }}>{c.health_score}%</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign:'center', padding:'28px 0', color:'var(--color-text-muted)', fontSize:13 }}>
                No campaigns yet. <a href="/dashboard/campaigns/new" style={{ color:'var(--color-primary-light)', textDecoration:'none', fontWeight:500 }}>Create first →</a>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
