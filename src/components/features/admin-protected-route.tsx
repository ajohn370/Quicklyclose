"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthModal } from './auth-modal'
import { Loader2, AlertCircle } from 'lucide-react'

interface AdminProtectedRouteProps {
  children: React.ReactNode
  fallbackMessage?: string
}

interface AdminStatus {
  adminExists: boolean
  canCreateAdmin: boolean
  isUserAdmin: boolean
}

export default function AdminProtectedRoute({ 
  children, 
  fallbackMessage 
}: AdminProtectedRouteProps) {
  const { user, userRole, loading, signOut } = useAuth()
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Check admin status when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      checkAdminStatus()
    }
  }, [user, loading])

  const checkAdminStatus = async () => {
    setChecking(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/users')
      const result = await response.json()
      
      if (result.success) {
        setAdminStatus({
          adminExists: result.data.adminExists,
          canCreateAdmin: result.data.canCreateAdmin,
          isUserAdmin: response.status !== 403 // If we get admin data, user is admin
        })

        // If no admins exist, redirect to setup
        if (!result.data.adminExists) {
          router.push('/admin/setup')
          return
        }
        
        // If admins exist but current user is not admin, we'll show access denied
        if (result.data.adminExists && response.status === 403) {
          setAdminStatus({
            adminExists: true,
            canCreateAdmin: false,
            isUserAdmin: false
          })
        }
      } else {
        setError(result.message || 'Failed to check admin status')
      }
    } catch (err) {
      setError('Network error checking admin status')
    } finally {
      setChecking(false)
    }
  }

  // Show loading state
  if (loading || checking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loading ? 'Loading...' : 'Checking admin access...'}</span>
        </div>
      </div>
    )
  }

  // Show auth modal if user not authenticated
  if (!user) {
    return <AuthModal isOpen={true} onClose={() => {}} userRole="admin" />
  }

  // Show error state if we couldn't check admin status
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <CardTitle className="text-xl text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => checkAdminStatus()} 
              className="w-full"
            >
              Try Again
            </Button>
            
            <Button 
              onClick={() => window.history.back()} 
              className="w-full"
              variant="outline"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If we're still checking or don't have status, show loading
  if (!adminStatus) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking admin access...</span>
        </div>
      </div>
    )
  }

  // Check if user has admin access
  if (adminStatus.adminExists && !adminStatus.isUserAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Admin Access Required</CardTitle>
            <CardDescription>
              {fallbackMessage || 'This page is only accessible to administrators.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p>You are currently logged in as a regular user.</p>
              <p>To access the admin dashboard, you need administrator privileges.</p>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => signOut()} 
                className="w-full"
                variant="outline"
              >
                Sign Out & Login as Admin
              </Button>
              
              <Button 
                onClick={() => router.push('/')} 
                className="w-full"
                variant="secondary"
              >
                Go to Home
              </Button>
            </div>
            
            <div className="text-xs text-center text-gray-500">
              If you believe this is an error, please contact your system administrator.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User has admin access, render children
  return <>{children}</>
}