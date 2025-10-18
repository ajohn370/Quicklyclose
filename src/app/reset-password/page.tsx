'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Loader2, Lock, CheckCircle, Eye, EyeOff, Check, X } from 'lucide-react'

interface PasswordStrength {
  score: number
  feedback: string[]
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 8) {
    score += 25
  } else {
    feedback.push('At least 8 characters')
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 25
  } else {
    feedback.push('One uppercase letter')
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 25
  } else {
    feedback.push('One lowercase letter')
  }

  // Number or special character check
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) {
    score += 25
  } else {
    feedback.push('One number or special character')
  }

  return { score, feedback }
}

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] })
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const portal = searchParams.get('portal') || 'investor'
  const supabase = createClient()

  // Handle the authentication tokens from the email link
  useEffect(() => {
    const handleEmailLinkAuth = async () => {
      try {
        // Check if we have the necessary tokens in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          // Set the session with the tokens from the email link
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (error) {
            console.error('Error setting session:', error)
            setError('Invalid or expired reset link. Please request a new one.')
            setIsValidToken(false)
          } else {
            console.log('Session established successfully')
            setIsValidToken(true)
            // Clean up the URL to remove the tokens
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
          }
        } else {
          // Check if user is already authenticated (for testing or if they're already logged in)
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsValidToken(true)
          } else {
            setError('Invalid password reset link. Please request a new one.')
            setIsValidToken(false)
          }
        }
      } catch (err) {
        console.error('Error handling email link auth:', err)
        setError('An error occurred. Please try again.')
        setIsValidToken(false)
      }
    }

    handleEmailLinkAuth()
  }, [supabase])

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password))
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (passwordStrength.score < 100) {
      setError('Please choose a stronger password')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First, verify we have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No valid session. Please request a new password reset link.')
      }

      // Update the user's password
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        throw updateError
      }

      console.log('Password updated successfully:', data)
      setSuccess(true)
      
      // Sign out to ensure clean state
      await supabase.auth.signOut()
      
      // Redirect to appropriate portal after 3 seconds
      setTimeout(() => {
        switch (portal) {
          case 'seller':
            router.push('/login?portal=seller&message=Password%20reset%20successful')
            break
          case 'admin':
            router.push('/login?portal=admin&message=Password%20reset%20successful')
            break
          default:
            router.push('/login?portal=investor&message=Password%20reset%20successful')
        }
      }, 3000)
    } catch (err: any) {
      console.error('Password update error:', err)
      setError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getPortalName = () => {
    switch (portal) {
      case 'seller':
        return 'Seller Portal'
      case 'admin':
        return 'Admin Dashboard'
      default:
        return 'Investor Portal'
    }
  }

  const getStrengthColor = () => {
    if (passwordStrength.score < 50) return 'bg-red-500'
    if (passwordStrength.score < 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    if (passwordStrength.score < 50) return 'Weak'
    if (passwordStrength.score < 75) return 'Fair'
    if (passwordStrength.score < 100) return 'Good'
    return 'Strong'
  }

  // Show loading state while checking token validity
  if (isValidToken === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
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
            <CardTitle>Verifying Reset Link</CardTitle>
            <CardDescription>Please wait while we verify your password reset link...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state if token is invalid
  if (isValidToken === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
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
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error || 'Please request a new password reset link.'}</AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => router.push(`/forgot-password?portal=${portal}`)}
              className="w-full"
            >
              Request New Reset Link
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              <Link 
                href={`/login?portal=${portal}`}
                className="text-primary hover:underline"
              >
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
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
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Password Reset Successful</CardTitle>
            <CardDescription className="mt-2">
              Your password has been successfully updated. Redirecting you to {getPortalName()}...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={100} className="w-full" />
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
          <CardTitle>Create New Password</CardTitle>
          <CardDescription>
            Enter your new password for {getPortalName()}
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
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                      {getStrengthText()}
                    </span>
                  </div>
                  
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Password should have:</p>
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
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={loading || passwordStrength.score < 100 || password !== confirmPassword}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  )
}