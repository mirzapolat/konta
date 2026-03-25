import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FolderOpen, QrCode, ClipboardList, BarChart2,
  Plus, ChevronRight, ChevronDown, Pencil, Trash2,
  MoreHorizontal
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { Project, ProjectItemType } from '@/types'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'

const typeIcons: Record<ProjectItemType, React.ReactNode> = {
  project: <FolderOpen size={14} className="text-amber-500" />,
  attendance: <QrCode size={14} className="text-blue-500" />,
  rsvp: <ClipboardList size={14} className="text-violet-500" />,
  series: <BarChart2 size={14} className="text-emerald-500" />,
}

const typeRoutes: Record<string, (id: string) => string> = {
  attendance: (id) => `/app/attendance/${id}`,
  rsvp: (id) => `/app/rsvp/${id}`,
  series: (id) => `/app/series/${id}`,
}

interface ProjectItemProps {
  item: Project
  depth: number
  allItems: Project[]
  onRefresh: () => void
}

function ProjectItem({ item, depth, allItems, onRefresh }: ProjectItemProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [newName, setNewName] = useState(item.name)
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)

  const children = allItems.filter(i => i.parent_id === item.id)
  const hasChildren = children.length > 0 || item.has_children > 0

  const handleClick = () => {
    if (item.type === 'project') {
      setExpanded(e => !e)
    } else {
      const route = typeRoutes[item.type]
      if (route) navigate(route(item.id))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', item.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); onRefresh() }
    setDeleting(false)
    setShowDelete(false)
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setRenaming(true)
    const { error } = await supabase.from('projects').update({ name: newName.trim() }).eq('id', item.id)
    if (error) toast.error(error.message)
    else { toast.success('Renamed'); onRefresh() }
    setRenaming(false)
    setShowRename(false)
  }

  return (
    <>
      <div
        className="group flex items-center gap-1.5 py-1.5 pr-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        style={{ paddingLeft: `${(depth + 1) * 16}px` }}
      >
        {/* Expand toggle for projects */}
        <div
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={(e) => { e.stopPropagation(); item.type === 'project' && setExpanded(e2 => !e2) }}
        >
          {item.type === 'project' && (
            hasChildren
              ? (expanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />)
              : <span className="w-3" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={handleClick}>
          {typeIcons[item.type]}
          <span className="text-sm text-gray-800 truncate">{item.name}</span>
        </div>

        {/* Actions */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded"
            onClick={e => { e.stopPropagation(); setShowMenu(m => !m) }}
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-36 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => { setShowMenu(false); setShowRename(true) }}
              >
                <Pencil size={12} /> Rename
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => { setShowMenu(false); setShowDelete(true) }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {item.type === 'project' && expanded && children.map(child => (
        <ProjectItem key={child.id} item={child} depth={depth + 1} allItems={allItems} onRefresh={onRefresh} />
      ))}

      {/* Click away */}
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={`Delete "${item.name}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />

      <Modal open={showRename} onClose={() => setShowRename(false)} title="Rename" size="sm">
        <form onSubmit={handleRename} className="flex flex-col gap-3 mt-1">
          <Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus required />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowRename(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={renaming}>Rename</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default function ProjectsPage() {
  const { t } = useTranslation()
  const { currentWorkspace } = useWorkspaceStore()
  const { profile } = useAuthStore()
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createType, setCreateType] = useState<ProjectItemType>('project')
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    if (!currentWorkspace) return
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }, [currentWorkspace])

  useEffect(() => { loadItems() }, [loadItems])

  const openCreate = (type: ProjectItemType, pid: string | null = null) => {
    setCreateType(type)
    setParentId(pid)
    setCreateName('')
    setShowCreate(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim() || !currentWorkspace || !profile) return
    setCreating(true)
    const { error } = await supabase.from('projects').insert({
      workspace_id: currentWorkspace.id,
      parent_id: parentId,
      name: createName.trim(),
      type: createType,
      has_children: 0,
      created_by: profile.id,
    })
    if (error) toast.error(error.message)
    else { toast.success('Created'); await loadItems() }
    setCreating(false)
    setShowCreate(false)
  }

  const rootItems = items.filter(i => i.parent_id === null)

  const createMenuItems: { type: ProjectItemType; label: string; icon: React.ReactNode }[] = [
    { type: 'project', label: t('projects.new_project'), icon: typeIcons.project },
    { type: 'attendance', label: t('projects.new_attendance'), icon: typeIcons.attendance },
    { type: 'rsvp', label: t('projects.new_rsvp'), icon: typeIcons.rsvp },
    { type: 'series', label: t('projects.new_series'), icon: typeIcons.series },
  ]

  return (
    <div>
      <PageHeader
        title={t('projects.title')}
        actions={
          <div className="relative group">
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              New
            </Button>
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-52 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
              <div className="p-1">
                {createMenuItems.map(m => (
                  <button
                    key={m.type}
                    onClick={() => openCreate(m.type)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : rootItems.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t('projects.empty')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('projects.empty_desc')}</p>
          <div className="flex items-center justify-center gap-2 mt-6">
            {createMenuItems.map(m => (
              <Button key={m.type} variant="outline" size="sm" icon={m.icon} onClick={() => openCreate(m.type)}>
                {m.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {rootItems.map(item => (
            <ProjectItem key={item.id} item={item} depth={0} allItems={items} onRefresh={loadItems} />
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={createMenuItems.find(m => m.type === createType)?.label || 'Create'}
        size="sm"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-3 mt-1">
          <Input
            label="Name"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={creating}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
