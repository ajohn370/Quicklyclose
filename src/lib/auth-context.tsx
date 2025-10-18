"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { InvestorProfile, SellerProfile, UserRole } from '@/types'

const supabase = createClient()

interface AuthContextType {
  user: User | null
  session: Session | null
  investorProfile: InvestorProfile | null
  sellerProfile: SellerProfile | null
  userRole: UserRole | null
  loading: boolean
  authError: string | null
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: any }>
  signIn: (email: string, password: string, preferredRole?: 'investor' | 'seller') => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateInvestorProfile: (profile: Partial<InvestorProfile>) => Promise<{ error: any }>
  updateSellerProfile: (profile: Partial<SellerProfile>) => Promise<{ error: any }>
  getUserRole: () => UserRole | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null)
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authInitialized, setAuthInitialized] = useState(false)

  // Helper function to get user role
  const getUserRole = (): UserRole | null => {
    if (!user) return null
    return (user.user_metadata?.role as UserRole) || 'investor'
  }

  // Load appropriate profile based on user role with priority
  const loadUserProfiles = useCallback(async (userId: string, role: UserRole) => {
    // Check for admin profile first (highest priority)
    const { data: adminData } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    
    if (adminData) {
      setUserRole('admin')
      // Admin profiles are handled separately
      return
    }
    
    // Load profiles based on the role hint
    if (role === 'investor') {
      await loadInvestorProfile(userId)
      setUserRole('investor')
    } else if (role === 'seller') {
      await loadSellerProfile(userId)
      setUserRole('seller')
    } else {
      // If no specific role, check both profiles
      await loadInvestorProfile(userId)
      await loadSellerProfile(userId)
      // Role will be set based on which profile exists
    }
  }, [])

  useEffect(() => {
    // Initialize session from server on mount
    const initializeAuth = async () => {
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          setLoading(false)
          return
        }

        // Check if Supabase is properly configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.warn('⚠️ Supabase not configured - running in offline mode')
          setAuthError('Supabase not configured')
          setLoading(false)
          return
        }

        // Get session without timeout - let Supabase handle retries naturally
        let session = null
        let error = null
        
        try {
          const { data, error: sessionError } = await supabase.auth.getSession()
          session = data?.session
          error = sessionError
        } catch (networkError) {
          console.warn('Network error during auth check - proceeding as unauthenticated:', networkError)
          setLoading(false)
          setAuthInitialized(true)
          return
        }

        if (error) {
          console.error('Auth session error:', error)
          setLoading(false)
          setAuthInitialized(true)
          return
        }
        
        if (!session) {
          // No session - user is not authenticated, exit immediately
          setLoading(false)
          setAuthInitialized(true)
          return
        }

        // User has a valid session
        setSession(session)
        setUser(session.user)
        if (session.user) {
          const role = (session.user.user_metadata?.role as UserRole) || 'investor'
          setUserRole(role)
          await loadUserProfiles(session.user.id, role)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setAuthError(error instanceof Error ? error.message : 'Auth initialization failed')
      }
      setLoading(false)
      setAuthInitialized(true)
    }

    initializeAuth()

    // Only set up auth state change listener if Supabase is configured
    let subscription: any = null
    
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            const role = (session.user.user_metadata?.role as UserRole) || 'investor'
            setUserRole(role)
            await loadUserProfiles(session.user.id, role)
          } else {
            setInvestorProfile(null)
            setSellerProfile(null)
            setUserRole(null)
          }
        })
        
        subscription = authSubscription
      }
    } catch (error) {
      console.error('Error setting up auth listener:', error)
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [loadUserProfiles])

  const loadInvestorProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('investor_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!data && !error) {
        // Profile doesn't exist, create it
        console.log('Creating investor profile for user:', userId)
        const { data: userData } = await supabase.auth.getUser()
        const fullName = userData?.user?.user_metadata?.full_name || 'User'
        
        const { data: newProfile, error: createError } = await supabase
          .from('investor_profiles')
          .insert({
            user_id: userId,
            full_name: fullName,
            investment_focus: [],
            minimum_investment: 0,
            maximum_investment: 0,
            preferred_locations: []
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating investor profile:', createError)
          return
        }

        setInvestorProfile(newProfile)
        return
      }

      if (error) {
        console.error('Error loading investor profile:', error)
        return
      }

      if (data) {
        setInvestorProfile(data)
      }
    } catch (error) {
      console.error('Error loading investor profile:', error)
    }
  }

  const loadSellerProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!data && !error) {
        // Profile doesn't exist, create it
        console.log('Creating seller profile for user:', userId)
        const { data: userData } = await supabase.auth.getUser()
        const fullName = userData?.user?.user_metadata?.full_name || 'User'
        
        const { data: newProfile, error: createError } = await supabase
          .from('seller_profiles')
          .insert({
            user_id: userId,
            full_name: fullName,
            email: userData?.user?.email || '',
            preferred_communication: 'email',
            marketing_consent: false
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating seller profile:', createError)
          return
        }

        setSellerProfile(newProfile)
        return
      }

      if (error) {
        console.error('Error loading seller profile:', error)
        return
      }

      if (data) {
        setSellerProfile(data)
      }
    } catch (error) {
      console.error('Error loading seller profile:', error)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    if (authError) {
      return { error: 'Authentication not available - Supabase not configured' }
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          }
        }
      })

      if (error) return { error }

      // The profile will be created automatically by the database trigger
      // But we'll also attempt to create it here as a fallback
      if (data.user) {
        // Wait a moment for the trigger to run
        setTimeout(async () => {
          if (role === 'investor') {
            await loadInvestorProfile(data.user!.id)
          } else if (role === 'seller') {
            await loadSellerProfile(data.user!.id)
          }
        }, 1000)
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string, preferredRole?: 'investor' | 'seller') => {
    console.log('🔐 signIn called with:', { email, preferredRole })
    
    if (authError) {
      return { error: 'Authentication not available - Supabase not configured' }
    }
    
    try {
      // Simplified sign-in without complex timeouts
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Supabase sign-in error:', error)
        return { error }
      }
      
      // After successful sign-in, determine user role
      if (data.user) {
        const metadataRole = data.user.user_metadata?.role
        
        // Check for admin profile first (simplified, no timeout)
        try {
          const { data: adminData } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .eq('is_active', true)
            .maybeSingle()
          
          if (adminData) {
            setUserRole('admin')
            return { error: null }
          }
        } catch (adminError) {
          console.warn('Admin profile check failed:', adminError)
        }
        
        // Check user profiles (simplified, no timeout)
        try {
          const [investorResult, sellerResult] = await Promise.all([
            supabase.from('investor_profiles').select('*').eq('user_id', data.user.id).maybeSingle(),
            supabase.from('seller_profiles').select('*').eq('user_id', data.user.id).maybeSingle()
          ])
          
          const hasInvestorProfile = investorResult?.data && !investorResult?.error
          const hasSellerProfile = sellerResult?.data && !sellerResult?.error
          
          console.log('Sign-in profile check:', {
            metadataRole,
            preferredRole,
            hasInvestorProfile,
            hasSellerProfile
          })
          
          // Handle role selection
          if (hasInvestorProfile && hasSellerProfile) {
            // User has both profiles - honor preferredRole
            const roleToUse = preferredRole || metadataRole || 'investor'
            
            if (roleToUse === 'seller') {
              setUserRole('seller')
              setSellerProfile(sellerResult.data)
              setInvestorProfile(investorResult.data)
            } else {
              setUserRole('investor')
              setInvestorProfile(investorResult.data)
              setSellerProfile(sellerResult.data)
            }
          } else if (hasInvestorProfile) {
            setUserRole('investor')
            setInvestorProfile(investorResult.data)
          } else if (hasSellerProfile) {
            setUserRole('seller')
            setSellerProfile(sellerResult.data)
          } else {
            // No profile exists, create investor profile by default
            await loadInvestorProfile(data.user.id)
            setUserRole('investor')
          }
        } catch (profileError) {
          console.error('Profile check failed:', profileError)
          // Fallback to investor role
          setUserRole('investor')
        }
      }
      
      return { error: null }
    } catch (error: any) {
      console.error('Sign-in error:', error)
      return { error: error.message || 'Sign-in failed' }
    }
  }

  const signOut = async () => {
    if (authError) {
      return { error: 'Authentication not available - Supabase not configured' }
    }
    
    try {
      // Clear all local state immediately to provide instant feedback
      setUser(null)
      setSession(null)
      setInvestorProfile(null)
      setSellerProfile(null)
      setUserRole(null)
      setLoading(false)
      
      // Then sign out from Supabase - let it handle retries naturally
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.warn('Supabase signout warning:', error)
          // Don't return the error since local state is cleared
        }
      } catch (supabaseError) {
        console.warn('Supabase signout failed:', supabaseError)
        // Continue anyway since local state is cleared
      }
      
      return { error: null }
    } catch (error) {
      console.error('Error signing out:', error)
      // Even on error, ensure local state is cleared
      setUser(null)
      setSession(null)
      setInvestorProfile(null)
      setSellerProfile(null)
      setUserRole(null)
      setLoading(false)
      // Don't return error since local state is cleared
      return { error: null }
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to home or login page after sign out
      // You might want to use Next.js router for this
      // import { useRouter } from 'next/navigation'
      // const router = useRouter()
      // router.push('/')
    }
  }, [user, loading])

  const updateInvestorProfile = async (profileData: Partial<InvestorProfile>) => {
    if (authError) {
      return { error: 'Authentication not available - Supabase not configured' }
    }
    
    if (!user) return { error: 'No user logged in' }

    try {
      const { data, error } = await supabase
        .from('investor_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) return { error }

      setInvestorProfile(data)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const updateSellerProfile = async (profileData: Partial<SellerProfile>) => {
    if (authError) {
      return { error: 'Authentication not available - Supabase not configured' }
    }
    
    if (!user) return { error: 'No user logged in' }

    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) return { error }

      setSellerProfile(data)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    session,
    investorProfile,
    sellerProfile,
    userRole,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    updateInvestorProfile,
    updateSellerProfile,
    getUserRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
