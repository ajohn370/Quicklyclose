"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

export function Header() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
      // Always redirect even if there's an error
      router.push('/marketing')
    } catch (error) {
      console.error('Sign out failed:', error)
      // Still redirect on error
      router.push('/marketing')
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const userRole = user?.user_metadata?.role

  const navLinks = [
    { href: '/seller-portal', label: 'For Sellers' },
    { href: '/investors', label: 'For Investors' },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-14 items-center">
          <div className="mr-auto flex items-center">
            <Link href="/marketing" className="flex items-center space-x-2">
              <Image src="/logo.png" alt="QuicklyClose Logo" width={120} height={24} />
            </Link>
          </div>
          
          <div className="flex items-center justify-end space-x-6">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Desktop navigation */}
            <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors hover:text-foreground/80 ${
                    pathname === link.href ? 'text-foreground' : 'text-foreground/60'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            
            {/* Desktop auth section */}
            {user ? (
              <div className="hidden md:flex items-center space-x-2">
                {userRole === 'investor' && <Link href="/investor-portal"><Button variant="ghost">Portal</Button></Link>}
                {userRole === 'seller' && <Link href="/seller-portal"><Button variant="ghost">My Properties</Button></Link>}
                {userRole === 'admin' && pathname !== '/admin' && <Link href="/admin"><Button variant="ghost">Admin Dashboard</Button></Link>}
                {userRole !== 'admin' && <Link href="/profile"><Button variant="ghost">Profile</Button></Link>}
                <Button variant="outline" size="sm" onClick={handleSignOut}>Sign Out</Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-white border-b shadow-lg">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors hover:bg-gray-100 ${
                  pathname === link.href ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                }`}
                onClick={closeMobileMenu}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile auth section */}
            {user ? (
              <div className="px-3 py-2 space-y-2 border-t mt-3 pt-3">
                {userRole === 'investor' && (
                  <Link href="/investor-portal" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start">Portal</Button>
                  </Link>
                )}
                {userRole === 'seller' && (
                  <Link href="/seller-portal" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start">My Properties</Button>
                  </Link>
                )}
                {userRole === 'admin' && pathname !== '/admin' && (
                  <Link href="/admin" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start">Admin Dashboard</Button>
                  </Link>
                )}
                {userRole !== 'admin' && (
                  <Link href="/profile" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start">Profile</Button>
                  </Link>
                )}
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => {
                    handleSignOut()
                    closeMobileMenu()
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
