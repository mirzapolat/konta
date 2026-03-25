import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import type { Profile } from '@/types'

export function useAuthInit() {
  const { setProfile, setLoading } = useAuthStore()
  const { setWorkspaces, setCurrentWorkspace, currentWorkspace } = useWorkspaceStore()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }

    const loadProfile = async (userId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profile) {
        setProfile(profile as Profile)
        await loadWorkspaces(userId)
      }
      setLoading(false)
    }

    const loadWorkspaces = async (userId: string) => {
      const { data } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('profile_id', userId)
        .in('status', ['owner', 'member'])

      if (data && data.length > 0) {
        const workspaces = data
          .map((d: any) => d.workspaces)
          .filter(Boolean)

        setWorkspaces(workspaces)

        if (!currentWorkspace || !workspaces.find((w: any) => w.id === currentWorkspace.id)) {
          setCurrentWorkspace(workspaces[0])
        }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setWorkspaces([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])
}
