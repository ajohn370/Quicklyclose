'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, user } = useAuth()
  
  const portal = searchParams.get('portal') || 'investor'
  const returnUrl = searchParams.get('returnUrl')
  const message = searchParams.get('message')

  // Show success message if redirected from password reset
  useEffect(() => {
    if (message) {
      setSuccessMessage(decodeURIComponent(message))
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('message')
      window.history.replaceState({}, document.title, url.toString())
    }
  }, [message])

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const redirectTo = returnUrl || getPortalUrl(portal)
      router.push(redirectTo)
    }
  }, [user, portal, returnUrl, router])

  const getPortalUrl = (portalType: string) => {
    switch (portalType) {
      case 'seller':
        return '/seller-portal'
      case 'admin':
        return '/admin'
      default:
        return '/investor-portal'
    }
  }

  const getPortalName = (portalType: string) => {
    switch (portalType) {
      case 'seller':
        return 'Seller Portal'
      case 'admin':
        return 'Admin Dashboard'
      default:
        return 'Investor Portal'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { error: signInError } = await signIn(email, password, portal === 'admin' ? undefined : portal as 'investor' | 'seller')
      
      if (signInError) {
        setError(signInError.message)
        return
      }

      // Redirect after successful sign in
      const redirectTo = returnUrl || getPortalUrl(portal)
      router.push(redirectTo)
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message || 'Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      {/* Clickable Logo */}
      <Link href="/marketing" className="mb-8 hover:opacity-80 transition-opacity">
        <Image 
          src="/logo.png" 
          alt="QuicklyClose Logo" 
          width={180} 
          height={36}
          priority
        />
      </Link>
      
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Sign in to your account to access {getPortalName(portal)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="email"
                  autoFocus
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>

            {/* Forgot password link */}
            <div className="text-center">
              <Link 
                href={`/forgot-password?portal=${portal}`}
                className="text-sm text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Sign up link for non-admin portals */}
            {portal !== 'admin' && (
              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link 
                  href={`/signup?portal=${portal}`}
                  className="text-primary hover:underline"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Admin note */}
            {portal === 'admin' && (
              <div className="text-center text-xs text-muted-foreground">
                Admin access is invite-only. Please contact support if you need access.
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}