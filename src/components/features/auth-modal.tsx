"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
  userRole?: 'investor' | 'seller' | 'admin'
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin', userRole = 'investor' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  const router = useRouter()
  const { signIn, signUp, user, userRole: currentUserRole } = useAuth()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // Force admin users to signin mode only (invite-only)
    if (userRole === 'admin') {
      setMode('signin')
    } else {
      setMode(defaultMode)
    }
  }, [defaultMode, isOpen, userRole])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup' && userRole !== 'admin') {
        const { error } = await signUp(email, password, fullName, userRole)
        
        if (error) {
          setError(error.message)
          setLoading(false)
        } else {
          // Keep loading state true during redirect
          // Wait for auth state to update
          setTimeout(() => {
            onClose()
            // ALWAYS redirect based on the intended role for the modal
            // This ensures sellers go to seller portal regardless of their profile setup
            const redirectPath = userRole === 'seller' ? '/seller-portal' : '/investor-portal'
            
            console.log('Auth modal redirecting:', {
              userRole,
              redirectPath,
              context: 'signup_success'
            })
            
            router.push(redirectPath)
            setLoading(false)
          }, 500)
        }
      } else {
        // Special handling for seller login to ensure correct role assignment
        if (userRole === 'seller' && mode === 'signin') {
          // Use dedicated seller login endpoint
          console.log('🛍️ Using dedicated seller login endpoint')
          
          const response = await fetch('/api/auth/seller-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          
          const result = await response.json()
          
          if (!response.ok || result.error) {
            setError(result.error || 'Login failed')
            setLoading(false)
          } else {
            // Success - close modal and redirect to seller portal
            onClose()
            console.log('✅ Seller login successful, redirecting to seller portal')
            
            // Use router navigation instead of forced page refresh
            router.push('/seller-portal')
            setLoading(false)
          }
        } else if (userRole === 'investor' && mode === 'signin') {
          // Use dedicated investor login endpoint
          console.log('💰 Using dedicated investor login endpoint')
          
          const response = await fetch('/api/auth/investor-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          
          const result = await response.json()
          
          if (!response.ok || result.error) {
            setError(result.error || 'Login failed')
            setLoading(false)
          } else {
            // Success - close modal and redirect to investor portal
            onClose()
            console.log('✅ Investor login successful, redirecting to investor portal')
            
            // Use router navigation instead of forced page refresh
            router.push('/investor-portal')
            setLoading(false)
          }
        } else {
          // Regular signin for admins or other cases
          const preferredRole = userRole === 'admin' ? undefined : userRole
          console.log('🚪 Auth modal calling signIn with:', { email, userRole, preferredRole })
          
          const { error } = await signIn(email, password, preferredRole)
          
          if (error) {
            setError(error.message)
            setLoading(false)
          } else {
            // Keep loading state true during redirect
            onClose()
            // Redirect based on the intended role for the modal
            const redirectPath = userRole === 'admin' ? '/admin' : '/investor-portal'
            
            console.log('Auth modal redirecting:', {
              userRole,
              redirectPath,
              context: 'signin_success'
            })
            
            // Add a small delay to ensure auth context processes the role
            setTimeout(() => {
              router.push(redirectPath)
              setLoading(false)
            }, 200)
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  if (!isMounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>
            {mode === 'signin' ? 'Sign In' : 'Create Account'} - {userRole === 'seller' ? 'Seller' : userRole === 'admin' ? 'Admin' : 'Investor'}
          </CardTitle>
          <CardDescription>
            {userRole === 'admin' 
              ? 'Admin access is invite-only. Please sign in with your provided credentials.'
              : mode === 'signin' 
                ? 'Sign in to your account to continue' 
                : 'Create a new account to get started'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && userRole !== 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          
          {/* Forgot password link for signin mode */}
          {mode === 'signin' && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  router.push(`/forgot-password?portal=${userRole}`)
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          )}
          
          {userRole !== 'admin' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-sm text-blue-600 hover:underline"
              >
                {mode === 'signin' 
                  ? 'Need an account? Sign up' 
                  : 'Already have an account? Sign in'
                }
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return createPortal(modalContent, document.body)
}
