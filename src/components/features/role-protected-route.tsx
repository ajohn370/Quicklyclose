"use client"

import React from 'react'
import { useAuth } from '@/lib/auth-context'
import { UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthModal } from './auth-modal'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  requiredRole: UserRole
  fallbackMessage?: string
}

export default function RoleProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackMessage 
}: RoleProtectedRouteProps) {
  const { user, userRole, loading, signOut } = useAuth()

  // Show loading state
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  // Show auth modal if user not authenticated
  if (!user) {
    return <AuthModal isOpen={true} onClose={() => {}} userRole={requiredRole} />
  }

  // Check if user has required role
  const currentRole = userRole || 'investor'
  
  if (currentRole !== requiredRole) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">Access Restricted</CardTitle>
            <CardDescription>
              {fallbackMessage || `This page is only accessible to ${requiredRole}s.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p>You are currently logged in as a <strong>{currentRole}</strong>.</p>
              <p>To access this page, you need to be logged in as a <strong>{requiredRole}</strong>.</p>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => signOut()} 
                className="w-full"
                variant="outline"
              >
                Sign Out & Login as {requiredRole}
              </Button>
              
              <Button 
                onClick={() => window.history.back()} 
                className="w-full"
                variant="secondary"
              >
                Go Back
              </Button>
            </div>
            
            <div className="text-xs text-center text-gray-500">
              If you believe this is an error, please contact support.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User has the required role, render children
  return <>{children}</>
}
