"use client"

import { useAuth } from '@/lib/auth-context'
import { AuthModal } from './auth-modal'
import { useState, useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredRole?: 'admin'
}

export function ProtectedRoute({ children, fallback, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true)
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const isAuthorized = () => {
    if (!user) return false
    if (requiredRole) {
      // Assuming role is stored in user_metadata
      return user.user_metadata?.role === requiredRole
    }
    return true
  }

  if (!isAuthorized()) {
    return (
      <>
        {fallback || (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <h1 className="text-2xl font-bold mb-4">
              {requiredRole === 'admin' ? 'Admin Access Required' : 'Access Denied'}
            </h1>
            <p className="text-gray-600 mb-6 max-w-md">
              {user 
                ? "You do not have permission to view this page."
                : "Please sign in to continue."
              }
            </p>
            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
          </div>
        )}
        {!user && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            userRole={requiredRole === 'admin' ? 'admin' : 'investor'}
          />
        )}
      </>
    )
  }

  return <>{children}</>
}
