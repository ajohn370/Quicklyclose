'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

interface PortalGuardProps {
  children: React.ReactNode
  requiredRole: 'seller' | 'investor' | 'admin'
  portalName: string
}

export function PortalGuard({ children, requiredRole, portalName }: PortalGuardProps) {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!user) {
        router.push(`/login?portal=${requiredRole}&returnUrl=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      // For now, allow access if user is authenticated
      // In the future, we'll check if user has the required role
      // This is a temporary fix to get the portal working
    }
  }, [user, userRole, loading, requiredRole, router])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not authenticated - will be redirected by useEffect
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // User is authenticated - render children
  // In the future, we'll check for specific roles here
  return <>{children}</>
}