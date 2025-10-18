'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut, CheckCircle, AlertCircle } from 'lucide-react'
import { Header } from '@/components/ui/header'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function SellerLogoutPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutComplete, setLogoutComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signOut, user, userRole } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setError(null)

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign out timeout')), 10000) // 10 second timeout
      })
      
      const signOutPromise = signOut()
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any
      
      if (error) {
        throw new Error(error.message || 'Failed to sign out')
      }

      setLogoutComplete(true)
      
      // Redirect to marketing page after a brief delay
      setTimeout(() => {
        router.push('/marketing')
      }, 2000)
      
    } catch (err) {
      console.error('Logout error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during logout')
      setIsLoggingOut(false)
      
      // If signout fails, still redirect after showing error
      setTimeout(() => {
        router.push('/marketing')
      }, 3000)
    }
  }

  // Auto-logout if user is not a seller
  useEffect(() => {
    if (user && userRole && userRole !== 'seller') {
      router.push('/marketing')
    }
  }, [user, userRole, router])

  // If user is not logged in, redirect to marketing
  useEffect(() => {
    if (!user && !isLoggingOut) {
      router.push('/marketing')
    }
  }, [user, isLoggingOut, router])

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50 py-12">
        <div className="max-w-md mx-auto px-4">
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                <LogOut className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">
                {logoutComplete ? 'Logged Out Successfully' : 'Sign Out'}
              </CardTitle>
              <CardDescription className="text-lg">
                {logoutComplete 
                  ? 'You have been successfully signed out of your seller account.'
                  : 'Are you sure you want to sign out?'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {logoutComplete ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Successfully signed out</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Redirecting you to the home page...
                  </p>
                  <Button 
                    onClick={() => router.push('/marketing')}
                    className="w-full"
                    variant="outline"
                  >
                    Go to Home Page
                  </Button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">What happens when you sign out?</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• You&apos;ll be signed out of your seller account</li>
                      <li>• Your property data will remain saved</li>
                      <li>• You can sign back in anytime</li>
                      <li>• You&apos;ll be redirected to the home page</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full"
                      variant="destructive"
                    >
                      {isLoggingOut ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing Out...
                        </>
                      ) : (
                        <>
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out of Seller Portal
                        </>
                      )}
                    </Button>

                    <Button 
                      onClick={() => router.back()}
                      disabled={isLoggingOut}
                      className="w-full"
                      variant="outline"
                    >
                      Cancel & Go Back
                    </Button>
                  </div>

                  <div className="text-xs text-center text-gray-500">
                    Having trouble? <a href="mailto:support@quicklyclose.com" className="text-blue-600 hover:underline">Contact support</a>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}