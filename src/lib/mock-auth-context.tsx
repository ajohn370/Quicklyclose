'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  checkSession: () => Promise<void>
}

// Mock admin user for development
const mockAdminUser: User = {
  id: 'mock-admin-user-id',
  email: 'admin@quicklyclose.com',
  app_metadata: {
    provider: 'email',
    providers: ['email']
  },
  user_metadata: {
    role: 'admin',
    full_name: 'Development Admin'
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  role: 'authenticated',
  phone: null,
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  last_sign_in_at: new Date().toISOString(),
  factors: null,
  identities: null,
  is_anonymous: false
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Auto-authenticate with mock admin user in development
    if (process.env.NODE_ENV === 'development') {
      setUser(mockAdminUser)
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    // Mock sign in - always succeed in development
    setUser(mockAdminUser)
  }

  const signOut = async () => {
    setUser(null)
  }

  const checkSession = async () => {
    // Always return mock admin user in development
    setUser(mockAdminUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
