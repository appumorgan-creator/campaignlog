import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, workspaces(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) redirect('/onboarding')

  // Fetch workspace stats in parallel
  const [
    { count: totalChanges },
    { count: activeCampaigns },
    { count: teamMembers },
    { count: flaggedItems },
    { data: recentChanges },
    { data: campaigns },
  ] = await Promise.all([
    supabase.from('change_logs').select('*', { count: 'exact', head: true }).eq('workspace_id', profile.workspace_id),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('workspace_id', profile.workspace_id).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('workspace_id', profile.workspace_id),
    supabase.from('change_logs').select('*', { count: 'exact', head: true }).eq('workspace_id', profile.workspace_id).eq('flagged', true),
    supabase.from('change_logs')
      .select('*, campaigns(name, channel), profiles(full_name, avatar_color, avatar_initials, marketing_role)')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('campaigns')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .order('updated_at', { ascending: false })
      .limit(6),
  ])

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');`}</style>

      {/* Welcome header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#09090b', letterSpacing: '-0.4px', marginBottom: 4 }}>
          Good morning, {profile.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ fontSize: 13, color: '#71717a' }}>
          {(profile as any).workspaces?.name} workspace · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total changes', value: totalChanges ?? 0, sub: 'All time' },
          { label: 'Active campaigns', value: activeCampaigns ?? 0, sub: `${(activeCampaigns ?? 0)} running` },
          { label: 'Team members', value: teamMembers ?? 0, sub: 'In workspace' },
          { label: 'Flagged items', value: flaggedItems ?? 0, sub: 'Need review', alert: (flaggedItems ?? 0) > 0 },
        ].map(k => (
          <div key={k.label} style={{
            background: '#fff', border: `1px solid ${k.alert ? '#fde68a' : '#e4e4e7'}`,
            borderRadius: 8, padding: '14px 16px',
            background: k.alert ? '#fffbeb' : '#fff',
          } as any}>
            <div style={{ fontSize: 10, fontWeight: 500, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.5px', color: k.alert ? '#d97706' : '#09090b', lineHeight: 1, marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#a1a1aa' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Two column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Recent activity */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#09090b', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            Recent activity
            <a href="/dashboard/changelog" style={{ fontSize: 11, fontWeight: 400, color: '#4f46e5', textDecoration: 'none' }}>View all →</a>
          </div>
          {recentChanges && recentChanges.length > 0 ? (
            recentChanges.map((log: any) => (
              <div key={log.id} style={{
                display: 'flex', gap: 10, padding: '8px 0',
                borderBottom: '1px solid #f4f4f5',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: '#eef2ff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 11 }}>
                    {log.change_type === 'budget' ? '💰' : log.change_type === 'creative' ? '🎨' : log.change_type === 'audience' ? '🎯' : log.change_type === 'pause' ? '⏸' : '📝'}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#09090b', lineHeight: 1.4 }}>
                    <strong style={{ fontWeight: 500 }}>{log.title}</strong>
                  </div>
                  <div style={{ fontSize: 10, color: '#a1a1aa', marginTop: 2 }}>
                    {log.campaigns?.name} · {log.profiles?.full_name} · {new Date(log.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#a1a1aa', fontSize: 12 }}>
              No changes logged yet.<br/>
              <a href="/dashboard/log" style={{ color: '#4f46e5', textDecoration: 'none' }}>Log your first change →</a>
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#09090b', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            Campaigns
            <a href="/dashboard/campaigns/new" style={{ fontSize: 11, fontWeight: 400, color: '#4f46e5', textDecoration: 'none' }}>+ New →</a>
          </div>
          {campaigns && campaigns.length > 0 ? (
            campaigns.map((c: any) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid #f4f4f5',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: c.status === 'active' ? '#22c55e' : c.status === 'paused' ? '#a1a1aa' : '#f59e0b',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#09090b' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: '#a1a1aa' }}>{c.channel || 'No channel set'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#a1a1aa' }}>Health</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.health_score > 70 ? '#16a34a' : c.health_score > 40 ? '#d97706' : '#dc2626' }}>
                    {c.health_score}%
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#a1a1aa', fontSize: 12 }}>
              No campaigns yet.<br/>
              <a href="/dashboard/campaigns/new" style={{ color: '#4f46e5', textDecoration: 'none' }}>Create your first campaign →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
