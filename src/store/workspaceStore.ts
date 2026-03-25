import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, WorkspaceMember } from '@/types'

interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  members: WorkspaceMember[]
  setCurrentWorkspace: (workspace: Workspace | null) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  setMembers: (members: WorkspaceMember[]) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      workspaces: [],
      members: [],
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setMembers: (members) => set({ members }),
    }),
    {
      name: 'konta-workspace',
      partialize: (state) => ({ currentWorkspace: state.currentWorkspace }),
    }
  )
)
