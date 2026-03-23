import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/dashboard/changelog', label: 'Change Log', icon: 'list' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/dashboard/campaigns/new', label: 'New Campaign', icon: 'plus' },
  { href: '/dashboard/log', label: 'Log Change', icon: 'edit' },
]

function NavIcon({ type, color }: { type: string; color: string }) {
  const s = { width: 16, height: 16, stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (type === 'home') return <svg viewBox="0 0 24 24" {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (type === 'list') return <svg viewBox="0 0 24 24" {...s}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  if (type === 'chart') return <svg viewBox="0 0 24 24" {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  if (type === 'plus') return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
  if (type === 'edit') return <svg viewBox="0 0 24 24" {...s}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  if (type === 'logout') return <svg viewBox="0 0 24 24" {...s}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  return null
}

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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 7px; text-decoration: none; font-size: 13px; font-weight: 500; color: #71717a; transition: all 0.12s; cursor: pointer; border: none; background: none; width: 100%; font-family: inherit; }
        .nav-item:hover { background: #f4f4f5; color: #09090b; }
        .nav-divider { height: 1px; background: #f4f4f5; margin: 8px 0; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, background: '#fff', borderRight: '1px solid #e4e4e7',
        display: 'flex', flexDirection: 'column', padding: '16px 12px',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px', marginBottom: 20, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, background: '#4f46e5', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M6 1v10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#09090b', letterSpacing: '-0.3px', lineHeight: 1.2 }}>CampaignLog</div>
            <div style={{ fontSize: 10, color: '#a1a1aa', lineHeight: 1.2 }}>{ws?.name || 'Workspace'}</div>
          </div>
        </a>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <a key={item.href} href={item.href} className="nav-item">
              <NavIcon type={item.icon} color="currentColor" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-divider" />

        {/* User profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: profile?.avatar_color || '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0,
          }}>
            {profile?.avatar_initials || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'User'}
            </div>
            <div style={{ fontSize: 10, color: '#a1a1aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.marketing_role || 'Member'}
            </div>
          </div>
        </div>

        {/* Logout */}
        <form action="/auth/logout" method="POST" style={{ marginTop: 4 }}>
          <button type="submit" className="nav-item" style={{ color: '#a1a1aa', fontSize: 12 }}>
            <NavIcon type="logout" color="currentColor" />
            Sign out
          </button>
        </form>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, marginLeft: 220, background: '#f9f9f9', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
