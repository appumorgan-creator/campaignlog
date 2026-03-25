import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/dashboard/changelog', label: 'Change log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

const ACTIONS = [
  { href: '/dashboard/campaigns/new', label: 'New campaign', icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/dashboard/log', label: 'Log change', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_color, avatar_initials, marketing_role, workspaces(name)')
    .eq('id', user.id)
    .single()

  const ws = (profile as any)?.workspaces

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{`
        .sb-nav { display:flex; align-items:center; gap:10px; padding:9px 14px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:500; color:#8A8A8A; transition:all .15s; font-family:var(--font-body); }
        .sb-nav:hover { background:rgba(255,255,255,.06); color:#D0D0D0; }
        .sb-nav svg { width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0; opacity:.7; }
        .sb-divider { height:1px; background:rgba(255,255,255,.07); margin:10px 0; }
        .sb-section { font-size:10px; font-weight:600; color:rgba(255,255,255,.25); text-transform:uppercase; letter-spacing:.08em; padding:0 14px; margin-bottom:6px; font-family:var(--font-display); }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--color-bg-sidebar)',
        display: 'flex', flexDirection: 'column', padding: '20px 14px',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        borderRight: '1px solid rgba(255,255,255,.06)',
      }}>
        {/* Logo */}
        <a href="/dashboard" style={{ display:'flex', alignItems:'center', gap:12, padding:'2px 8px', marginBottom:28, textDecoration:'none' }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <rect width="30" height="30" rx="8" fill="#6366F1"/>
            <path d="M8 11h6M8 15h10M8 19h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="22" cy="11" r="2.5" fill="#A5F3FC"/>
          </svg>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#FFFFFF', letterSpacing:'-0.03em', lineHeight:1.2, fontFamily:'var(--font-display)' }}>CampaignLog</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', lineHeight:1.2, fontFamily:'var(--font-body)' }}>{ws?.name || 'Workspace'}</div>
          </div>
        </a>

        {/* Main nav */}
        <div className="sb-section">Navigate</div>
        <nav style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:16 }}>
          {NAV.map(item => (
            <a key={item.href} href={item.href} className="sb-nav">
              <svg viewBox="0 0 24 24"><path d={item.icon}/></svg>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sb-divider"/>

        {/* Actions */}
        <div className="sb-section" style={{ marginTop:10 }}>Actions</div>
        <nav style={{ display:'flex', flexDirection:'column', gap:2, flex:1 }}>
          {ACTIONS.map(item => (
            <a key={item.href} href={item.href} className="sb-nav">
              <svg viewBox="0 0 24 24"><path d={item.icon}/></svg>
              {item.label}
            </a>
          ))}
        </nav>

        {/* User */}
        <div className="sb-divider"/>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 8px' }}>
          <div style={{
            width:32, height:32, borderRadius:'50%',
            background: profile?.avatar_color || '#6366F1',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:600, color:'#fff', flexShrink:0,
            fontFamily:'var(--font-display)',
          }}>
            {profile?.avatar_initials || '?'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#E0E0E0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontFamily:'var(--font-body)' }}>
              {profile?.full_name || 'User'}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:'var(--font-body)' }}>
              {profile?.marketing_role || 'Member'}
            </div>
          </div>
        </div>

        <form action="/auth/logout" method="POST">
          <button type="submit" className="sb-nav" style={{ width:'100%', border:'none', cursor:'pointer', fontFamily:'var(--font-body)' }}>
            <svg viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign out
          </button>
        </form>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, marginLeft:240, background:'var(--color-bg)', minHeight:'100vh' }}>
        {children}
      </main>
    </div>
  )
}
