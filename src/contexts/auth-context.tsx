'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Role, Portal, UserProfile } from '@/lib/auth-enhanced'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  activeRole: Role | null
  availableRoles: Role[]
  loading: boolean
  error: string | null
  signIn: (email: string, password: string, role?: Role) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role?: Role) => Promise<void>
  signOut: () => Promise<void>
  switchRole: (role: Role) => Promise<void>
  addRole: (role: Role) => Promise<void>
  hasRole: (role: Role) => boolean
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper to determine portal from pathname
function getPortalFromPath(pathname: string): Portal | null {
  if (pathname.includes('/seller-portal')) return 'seller_portal'
  if (pathname.includes('/investor-portal')) return 'investor_portal'
  if (pathname.includes('/admin')) return 'admin_portal'
  return null
}

// Helper to get role from portal
function getRoleFromPortal(portal: Portal): Role {
  switch (portal) {
    case 'seller_portal': return 'seller'
    case 'investor_portal': return 'investor'
    case 'admin_portal': return 'admin'
  }
}

interface AuthProviderProps {
  children: React.ReactNode
  portal?: Portal
}

export function AuthProvider({ children, portal: initialPortal }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Determine current portal from path
  const currentPortal = initialPortal || getPortalFromPath(pathname)

  // Load user profile and roles
  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError) {
        console.error('Profile load error:', profileError)
        return
      }

      setProfile(profileData)

      // Get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (rolesError) {
        console.error('Roles load error:', rolesError)
        return
      }

      const roles = rolesData?.map(r => r.role as Role) || []
      setAvailableRoles(roles)

      // Determine active role based on current portal
      if (currentPortal) {
        const portalRole = getRoleFromPortal(currentPortal)
        if (roles.includes(portalRole)) {
          setActiveRole(portalRole)
        } else if (roles.length > 0) {
          // User doesn't have required role for this portal
          setActiveRole(roles[0])
        }
      } else if (roles.length > 0) {
        setActiveRole(roles[0])
      }
    } catch (err) {
      console.error('Load user data error:', err)
      setError('Failed to load user data')
    }
  }, [supabase, currentPortal])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Failed to load session')
          return
        }

        if (session?.user) {
          setUser(session.user)
          await loadUserData(session.user.id)
        }
      } catch (err) {
        console.error('Init auth error:', err)
        setError('Failed to initialize authentication')
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await loadUserData(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setActiveRole(null)
        setAvailableRoles([])
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, loadUserData])

  // Sign in
  const signIn = async (email: string, password: string, role?: Role) => {
    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user) {
        setUser(data.user)
        await loadUserData(data.user.id)

        // Navigate to appropriate portal if role specified
        if (role) {
          const portalMap: Record<Role, string> = {
            seller: '/seller-portal',
            investor: '/investor-portal',
            admin: '/admin'
          }
          router.push(portalMap[role])
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message || 'Failed to sign in')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Sign up
  const signUp = async (email: string, password: string, fullName: string, role: Role = 'investor') => {
    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (error) throw error

      if (data.user) {
        setUser(data.user)
        await loadUserData(data.user.id)

        // Navigate to appropriate portal
        const portalMap: Record<Role, string> = {
          seller: '/seller-portal',
          investor: '/investor-portal',
          admin: '/admin'
        }
        router.push(portalMap[role])
      }
    } catch (err: any) {
      console.error('Sign up error:', err)
      setError(err.message || 'Failed to sign up')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setError(null)
      setLoading(true)

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setProfile(null)
      setActiveRole(null)
      setAvailableRoles([])
      
      router.push('/')
    } catch (err: any) {
      console.error('Sign out error:', err)
      setError(err.message || 'Failed to sign out')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Switch role
  const switchRole = async (role: Role) => {
    if (!user) return

    try {
      setError(null)
      
      // Check if user has the role
      if (!availableRoles.includes(role)) {
        // Add the role
        await addRole(role)
      }

      setActiveRole(role)

      // Navigate to appropriate portal
      const portalMap: Record<Role, string> = {
        seller: '/seller-portal',
        investor: '/investor-portal',
        admin: '/admin'
      }
      router.push(portalMap[role])
    } catch (err: any) {
      console.error('Switch role error:', err)
      setError(err.message || 'Failed to switch role')
      throw err
    }
  }

  // Add role
  const addRole = async (role: Role) => {
    if (!user) return

    try {
      setError(null)

      const { error } = await supabase.rpc('add_user_role', {
        p_user_id: user.id,
        p_role: role
      })

      if (error) throw error

      // Refresh roles
      setAvailableRoles(prev => [...prev, role])
    } catch (err: any) {
      console.error('Add role error:', err)
      setError(err.message || 'Failed to add role')
      throw err
    }
  }

  // Check if user has role
  const hasRole = (role: Role): boolean => {
    return availableRoles.includes(role)
  }

  // Refresh auth state
  const refreshAuth = async () => {
    if (!user) return

    try {
      setError(null)
      await loadUserData(user.id)
    } catch (err: any) {
      console.error('Refresh auth error:', err)
      setError(err.message || 'Failed to refresh authentication')
      throw err
    }
  }

  const value: AuthContextValue = {
    user,
    profile,
    activeRole,
    availableRoles,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    switchRole,
    addRole,
    hasRole,
    refreshAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook for requiring authentication
export function useRequireAuth(requiredRole?: Role) {
  const { user, activeRole, availableRoles, loading, hasRole } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`)
      return
    }

    if (requiredRole && !hasRole(requiredRole)) {
      // Redirect to role registration
      router.push(`/register-role/${requiredRole}?returnUrl=${encodeURIComponent(pathname)}`)
      return
    }
  }, [user, requiredRole, hasRole, loading, router, pathname])

  return {
    user,
    activeRole,
    availableRoles,
    loading,
    authorized: user && (!requiredRole || hasRole(requiredRole))
  }
}