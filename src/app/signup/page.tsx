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
import { Progress } from '@/components/ui/progress'
import { Loader2, Mail, Lock, Eye, EyeOff, User, Check, X } from 'lucide-react'

interface PasswordStrength {
  score: number
  feedback: string[]
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) {
    score += 25
  } else {
    feedback.push('At least 8 characters')
  }

  if (/[A-Z]/.test(password)) {
    score += 25
  } else {
    feedback.push('One uppercase letter')
  }

  if (/[a-z]/.test(password)) {
    score += 25
  } else {
    feedback.push('One lowercase letter')
  }

  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) {
    score += 25
  } else {
    feedback.push('One number or special character')
  }

  return { score, feedback }
}

function SignUpContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, user } = useAuth()
  
  const portal = searchParams.get('portal') || 'investor'

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push(getPortalUrl(portal))
    }
  }, [user, portal, router])

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password))
  }, [password])

  const getPortalUrl = (portalType: string) => {
    switch (portalType) {
      case 'seller':
        return '/seller-portal'
      default:
        return '/investor-portal'
    }
  }

  const getPortalName = (portalType: string) => {
    switch (portalType) {
      case 'seller':
        return 'Seller Portal'
      default:
        return 'Investor Portal'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password || !fullName) {
      setError('Please fill in all fields')
      return
    }

    if (passwordStrength.score < 100) {
      setError('Please choose a stronger password')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { error: signUpError } = await signUp(email, password, fullName, portal)
      
      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // Redirect after successful sign up
      router.push(getPortalUrl(portal))
    } catch (err: any) {
      console.error('Sign up error:', err)
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Don't allow admin signup
  if (portal === 'admin') {
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
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>
              Admin accounts are invite-only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Admin access is restricted to invited users only. Please contact support if you need admin access.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Link 
                href="/login?portal=admin"
                className="text-sm text-primary hover:underline"
              >
                Already have admin access? Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Create your account to access {getPortalName(portal)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="name"
                  autoFocus
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
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
              
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress value={passwordStrength.score} className="flex-1 h-2" />
                    <span className={`text-xs font-medium ${
                      passwordStrength.score < 50 ? 'text-red-500' : 
                      passwordStrength.score < 75 ? 'text-yellow-500' : 
                      passwordStrength.score < 100 ? 'text-blue-500' : 'text-green-500'
                    }`}>
                      {passwordStrength.score < 50 ? 'Weak' : 
                       passwordStrength.score < 75 ? 'Fair' : 
                       passwordStrength.score < 100 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Password must have:</p>
                    <ul className="space-y-1">
                      <li className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-600' : ''}`}>
                        {password.length >= 8 ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        At least 8 characters
                      </li>
                      <li className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-600' : ''}`}>
                        {/[A-Z]/.test(password) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        One uppercase letter
                      </li>
                      <li className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-600' : ''}`}>
                        {/[a-z]/.test(password) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        One lowercase letter
                      </li>
                      <li className={`flex items-center gap-1 ${/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}`}>
                        {/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        One number or special character
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={loading || passwordStrength.score < 100}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link 
                href={`/login?portal=${portal}`}
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignUpPage() {
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
      <SignUpContent />
    </Suspense>
  )
}