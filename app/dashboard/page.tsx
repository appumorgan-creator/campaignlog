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
  const typeIcons: any = {
    budget:'💰', creative:'🎨', audience:'🎯', pause:'⏸',
    launch:'🚀', copy:'✏️', targeting:'📍', platform:'🔄', note:'📝'
  }

  return (
    <div style={{ padding:'32px 28px' }}>
      <div style={{ maxWidth:960, margin:'0 auto' }}>

        <div style={{ marginBottom:28, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:600, color:'#09090b', letterSpacing:'-0.4px', marginBottom:4 }}>
              Welcome, {profile.full_name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p style={{ fontSize:13, color:'#71717a' }}>
              {ws?.name} · {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
            </p>
          </div>
          <a href="/dashboard/log" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0 16px', height:38, background:'#4f46e5', color:'#fff', borderRadius:8, fontSize:13, fontWeight:500, textDecoration:'none' }}>
            + Log change
          </a>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Total changes', value: totalChanges ?? 0, sub:'All time', alert: false },
            { label:'Active campaigns', value: activeCampaigns ?? 0, sub:'Running now', alert: false },
            { label:'Team members', value: teamMembers ?? 0, sub:'In workspace', alert: false },
            { label:'Flagged items', value: flaggedItems ?? 0, sub:'Need review', alert: (flaggedItems ?? 0) > 0 },
          ].map(k => (
            <div key={k.label} style={{
              background: k.alert ? '#fffbeb' : '#fff',
              border: `1px solid ${k.alert ? '#fde68a' : '#e4e4e7'}`,
              borderRadius:8, padding:'14px 16px'
            }}>
              <div style={{ fontSize:10, fontWeight:500, color:'#a1a1aa', textTransform:'uppercase', letterSpacing:'.3px', marginBottom:5 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-.5px', color: k.alert ? '#d97706' : '#09090b', lineHeight:1, marginBottom:3 }}>{k.value}</div>
              <div style={{ fontSize:11, color:'#a1a1aa' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

          <div style={{ background:'#fff', border:'1px solid #e4e4e7', borderRadius:8, padding:16 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#09090b', marginBottom:12, display:'flex', justifyContent:'space-between' }}>
              Recent activity
              <a href="/dashboard/changelog" style={{ fontSize:11, fontWeight:400, color:'#4f46e5', textDecoration:'none' }}>View all →</a>
            </div>
            {recentChanges && recentChanges.length > 0 ? (
              recentChanges.map((log: any) => (
                <div key={log.id} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:'1px solid #f4f4f5' }}>
                  <div style={{ width:28, height:28, borderRadius:6, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13 }}>
                    {typeIcons[log.change_type] || '📝'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:'#09090b', fontWeight:500, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {log.title}
                    </div>
                    <div style={{ fontSize:10, color:'#a1a1aa', marginTop:2 }}>
                      {log.campaigns?.name} · {new Date(log.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign:'center', padding:'24px 0', color:'#a1a1aa', fontSize:12 }}>
                No changes yet. <a href="/dashboard/log" style={{ color:'#4f46e5', textDecoration:'none' }}>Log your first →</a>
              </div>
            )}
          </div>

          <div style={{ background:'#fff', border:'1px solid #e4e4e7', borderRadius:8, padding:16 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#09090b', marginBottom:12, display:'flex', justifyContent:'space-between' }}>
              Campaigns
              <a href="/dashboard/campaigns/new" style={{ fontSize:11, fontWeight:400, color:'#4f46e5', textDecoration:'none' }}>+ New →</a>
            </div>
            {campaigns && campaigns.length > 0 ? (
              campaigns.map((c: any) => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #f4f4f5' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: c.status==='active'?'#22c55e':c.status==='paused'?'#a1a1aa':'#f59e0b' }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'#09090b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize:10, color:'#a1a1aa' }}>{c.channel || 'No channel'}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:10, color:'#a1a1aa' }}>Health</div>
                    <div style={{ fontSize:12, fontWeight:600, color: c.health_score>70?'#16a34a':c.health_score>40?'#d97706':'#dc2626' }}>{c.health_score}%</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign:'center', padding:'24px 0', color:'#a1a1aa', fontSize:12 }}>
                No campaigns yet. <a href="/dashboard/campaigns/new" style={{ color:'#4f46e5', textDecoration:'none' }}>Create first →</a>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
