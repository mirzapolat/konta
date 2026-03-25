import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FolderOpen, Users, Settings, Bell, User, ChevronLeft, ChevronRight,
  Heart, ChevronDown, Plus, Check, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import AppLogo from '@/components/ui/AppLogo'
import { ConfirmModal } from '@/components/ui/Modal'

export default function Sidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const { currentWorkspace, workspaces, setCurrentWorkspace, setWorkspaces } = useWorkspaceStore()
  const [collapsed, setCollapsed] = useState(false)
  const [wsOpen, setWsOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const mainNav = [
    { to: '/app/projects', label: t('nav.projects'), icon: <FolderOpen size={16} /> },
    { to: '/app/members', label: t('nav.members'), icon: <Users size={16} /> },
    { to: '/app/settings', label: t('nav.settings'), icon: <Settings size={16} /> },
  ]

  const bottomNav = [
    { to: '/app/notifications', label: t('nav.notifications'), icon: <Bell size={16} /> },
    { to: '/app/account', label: t('nav.account'), icon: <User size={16} /> },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out')
  }

  const handleWorkspaceSwitch = async (id: string) => {
    const ws = workspaces.find(w => w.id === id)
    if (ws) {
      setCurrentWorkspace(ws)
      setWsOpen(false)
    }
  }

  const handleCreateWorkspace = async () => {
    const name = prompt('Workspace name')
    if (!name?.trim()) return
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), branding: null })
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    if (data) {
      await supabase.from('workspace_members').insert({
        workspace_id: data.id,
        profile_id: profile!.id,
        status: 'owner',
      })
      setCurrentWorkspace(data)
      setWorkspaces([...workspaces, data])
      toast.success('Workspace created')
    }
    setWsOpen(false)
  }

  return (
    <>
      <aside className={cn(
        'h-screen flex flex-col bg-white border-r border-gray-200 transition-all duration-200 shrink-0',
        'hidden sm:flex',
        collapsed ? 'w-14' : 'w-56'
      )}>
        {/* App logo + collapse button */}
        <div className="flex items-center justify-between px-3 py-3.5 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <AppLogo size={20} />
              <span className="text-sm font-semibold text-gray-900">Konta</span>
            </div>
          )}
          {collapsed && <AppLogo size={20} className="mx-auto" />}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={cn(
              'w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors',
              collapsed && 'mx-auto'
            )}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Workspace selector */}
        <div className="px-2 py-2 border-b border-gray-100 relative">
          <button
            onClick={() => setWsOpen(o => !o)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left',
              collapsed && 'justify-center'
            )}
          >
            <div className="w-6 h-6 rounded-md bg-gray-900 flex items-center justify-center shrink-0 overflow-hidden">
              {currentWorkspace?.branding?.logo_url ? (
                <img src={currentWorkspace.branding.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">
                  {currentWorkspace?.name?.[0]?.toUpperCase() || 'W'}
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                  {currentWorkspace?.name || 'Select workspace'}
                </span>
                <ChevronDown size={14} className="text-gray-400 shrink-0" />
              </>
            )}
          </button>

          {/* Workspace dropdown */}
          {wsOpen && (
            <div className={cn(
              'absolute top-full left-2 right-2 mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden',
              collapsed && 'left-14 right-auto w-48'
            )}>
              <div className="p-1">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => handleWorkspaceSwitch(ws.id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="w-5 h-5 rounded bg-gray-900 flex items-center justify-center shrink-0 overflow-hidden">
                      {ws.branding?.logo_url ? (
                        <img src={ws.branding.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">{ws.name[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-700 flex-1 truncate">{ws.name}</span>
                    {currentWorkspace?.id === ws.id && <Check size={12} className="text-gray-500" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 p-1">
                <button
                  onClick={handleCreateWorkspace}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <Plus size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-600">{t('workspace.create')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-thin">
          {mainNav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app/projects'}>
              {({ isActive }) => (
                <div className={cn(
                  'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center px-2'
                )}>
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="px-2 py-2 border-t border-gray-100">
          {/* Support button */}
          <a
            href="https://donate.stripe.com/aFa8wO78f6zndFp2xF0kE03"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors mb-0.5',
              collapsed && 'justify-center'
            )}
          >
            <Heart size={16} className="text-rose-400 shrink-0" />
            {!collapsed && t('nav.support')}
          </a>

          {bottomNav.map(item => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <div className={cn(
                  'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center'
                )}>
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && item.label}
                </div>
              )}
            </NavLink>
          ))}

          {/* Profile / Logout */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors mt-1',
              collapsed && 'justify-center'
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && t('auth.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-1.5">
        {mainNav.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/app/projects'}>
            {({ isActive }) => (
              <div className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isActive ? 'text-gray-900' : 'text-gray-400'
              )}>
                {item.icon}
                <span className="text-[10px]">{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
        {bottomNav.map(item => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <div className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isActive ? 'text-gray-900' : 'text-gray-400'
              )}>
                {item.icon}
                <span className="text-[10px]">{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Click-away for workspace dropdown */}
      {wsOpen && <div className="fixed inset-0 z-40" onClick={() => setWsOpen(false)} />}

      <ConfirmModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title={t('auth.logout')}
        description="Are you sure you want to log out?"
        confirmLabel={t('auth.logout')}
        variant="primary"
      />
    </>
  )
}
