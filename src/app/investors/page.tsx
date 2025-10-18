'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/ui/header"
import { Badge } from "@/components/ui/badge"
import { useState } from 'react'
import { AuthModal } from '@/components/features/auth-modal'

export default function InvestorsLandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')

  const handleSignUp = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
  }

  const handleLogin = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Invest in Pre-Vetted Properties with AI Analysis
                </h1>
                <p className="mx-auto max-w-[700px] text-xl md:text-2xl">
                  Access exclusive off-market deals with comprehensive AI-powered property insights and direct seller connections.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100" onClick={handleSignUp}>
                  Sign Up as Investor
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10" onClick={handleLogin}>
                  Investor Login
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-center mb-12">
              Why Invest with QuicklyClose?
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Pre-Screened Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Every property is verified by our team and analyzed by AI before being listed. 
                    Save time by only viewing quality investment opportunities.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    AI-Powered Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get detailed investment metrics including fix & flip potential, rental income estimates, 
                    and neighborhood analysis powered by our Comp Vision AI.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    Expert Deal Facilitation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Our real estate professionals facilitate all transactions, ensuring smooth communications and favorable terms while maintaining confidentiality for all parties.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Sample Properties Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-center mb-12">
              Featured Investment Opportunities
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Sample Property 1 */}
              <Card className="overflow-hidden">
                <div className="h-48 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="Colonial style home with brick exterior"
                    fill
                    className="object-cover"
                  />
                  <Badge className="absolute top-2 right-2" variant="secondary">Fix & Flip</Badge>
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-lg mb-2">123 Oak Street, Dallas, TX</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Asking Price:</span>
                      <span className="font-semibold">$285,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ARV:</span>
                      <span className="font-semibold text-green-600">$385,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Profit:</span>
                      <span className="font-semibold text-green-600">$65,000</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                    3 bed • 2 bath • 1,850 sqft
                  </div>
                </CardContent>
              </Card>

              {/* Sample Property 2 */}
              <Card className="overflow-hidden">
                <div className="h-48 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="Modern two-story home with garage"
                    fill
                    className="object-cover"
                  />
                  <Badge className="absolute top-2 right-2" variant="secondary">Rental</Badge>
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-lg mb-2">456 Pine Ave, Houston, TX</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Asking Price:</span>
                      <span className="font-semibold">$195,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Rent:</span>
                      <span className="font-semibold text-green-600">$2,200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cap Rate:</span>
                      <span className="font-semibold text-green-600">8.5%</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                    4 bed • 2.5 bath • 2,100 sqft
                  </div>
                </CardContent>
              </Card>

              {/* Sample Property 3 */}
              <Card className="overflow-hidden">
                <div className="h-48 relative">
                  <Image
                    src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="Multi-unit residential building"
                    fill
                    className="object-cover"
                  />
                  <Badge className="absolute top-2 right-2" variant="secondary">Multi-Unit</Badge>
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-lg mb-2">789 Elm Court, Austin, TX</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Asking Price:</span>
                      <span className="font-semibold">$425,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Rent:</span>
                      <span className="font-semibold text-green-600">$4,800/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Units:</span>
                      <span className="font-semibold">3 units</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                    Triplex • Recently renovated
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <p className="text-gray-600 mb-4">Sign up to view all properties and detailed investment analytics</p>
              <Button size="lg" onClick={handleSignUp}>
                Get Started Today
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 bg-indigo-600 text-white">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Investing?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join our network of successful real estate investors and access exclusive deals before they hit the market.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100" onClick={handleSignUp}>
                Create Investor Account
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10" onClick={handleLogin}>
                Sign In to Portal
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="QuicklyClose Logo" width={120} height={24} />
          <p className="text-xs text-gray-500">© 2024 All rights reserved.</p>
        </div>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="/legal/terms-of-use">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/legal/privacy-policy">
            Privacy
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/legal/disclaimers">
            Disclaimers
          </Link>
        </nav>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
        userRole="investor"
      />
    </div>
  )
}
