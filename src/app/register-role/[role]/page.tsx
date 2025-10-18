'use client'

import { useState, use, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { Role } from '@/lib/auth-enhanced'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, UserPlus, ArrowLeft } from 'lucide-react'

interface RoleFormData {
  // Seller specific
  companyName?: string
  licenseNumber?: string
  preferredRegions?: string
  
  // Investor specific
  minInvestment?: string
  maxInvestment?: string
  propertyTypes?: string
  accreditationStatus?: string
  
  // Admin specific
  department?: string
  adminLevel?: string
  reason?: string
}

interface PageProps {
  params: Promise<{ role: string }>
}

function RegisterRoleContent({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, addRole, switchRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<RoleFormData>({})
  
  // Use the new Next.js 15 pattern for async params
  const { role: roleParam } = use(params)
  const role = roleParam as Role
  const returnUrl = searchParams.get('returnUrl') || `/${role}-portal`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      router.push('/login')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Add the role
      await addRole(role)
      
      // TODO: Save role-specific data to appropriate table
      // This would be done via an API call to save seller_data, investor_data, or admin_data

      // Switch to the new role
      await switchRole(role)

      // Redirect to return URL or portal
      router.push(returnUrl)
    } catch (err: any) {
      setError(err.message || 'Failed to register role')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  // Role-specific form fields
  const renderRoleFields = () => {
    switch (role) {
      case 'seller':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <Input
                id="companyName"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Your company or agency name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number (Optional)</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber || ''}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="Real estate license number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredRegions">Preferred Regions (Optional)</Label>
              <Textarea
                id="preferredRegions"
                value={formData.preferredRegions || ''}
                onChange={(e) => setFormData({ ...formData, preferredRegions: e.target.value })}
                placeholder="Areas you typically work in"
                rows={3}
              />
            </div>
          </>
        )

      case 'investor':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minInvestment">Min Investment</Label>
                <Input
                  id="minInvestment"
                  type="number"
                  value={formData.minInvestment || ''}
                  onChange={(e) => setFormData({ ...formData, minInvestment: e.target.value })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxInvestment">Max Investment</Label>
                <Input
                  id="maxInvestment"
                  type="number"
                  value={formData.maxInvestment || ''}
                  onChange={(e) => setFormData({ ...formData, maxInvestment: e.target.value })}
                  placeholder="500000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyTypes">Property Types of Interest</Label>
              <Textarea
                id="propertyTypes"
                value={formData.propertyTypes || ''}
                onChange={(e) => setFormData({ ...formData, propertyTypes: e.target.value })}
                placeholder="Single family, multi-family, commercial, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accreditationStatus">Accreditation Status</Label>
              <select
                id="accreditationStatus"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={formData.accreditationStatus || ''}
                onChange={(e) => setFormData({ ...formData, accreditationStatus: e.target.value })}
              >
                <option value="">Select status</option>
                <option value="accredited">Accredited Investor</option>
                <option value="qualified">Qualified Purchaser</option>
                <option value="non-accredited">Non-Accredited</option>
              </select>
            </div>
          </>
        )

      case 'admin':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Operations, Sales, Support, etc."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Admin Access</Label>
              <Textarea
                id="reason"
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Please explain why you need admin access"
                rows={4}
                required
              />
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Admin access requests require approval. You will be notified once your request is reviewed.
              </p>
            </div>
          </>
        )

      default:
        return null
    }
  }

  const getRoleDescription = () => {
    switch (role) {
      case 'seller':
        return 'As a seller, you can submit properties, track offers, and manage your listings.'
      case 'investor':
        return 'As an investor, you can browse properties, submit offers, and manage your investment portfolio.'
      case 'admin':
        return 'Admin access allows you to manage users, properties, and system settings.'
      default:
        return ''
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
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
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to register for the {role} role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
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
      
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <CardTitle>Register as {role.charAt(0).toUpperCase() + role.slice(1)}</CardTitle>
          <CardDescription>
            {getRoleDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            {renderRoleFields()}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Complete Registration
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterRolePage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-2xl w-full">
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
      <RegisterRoleContent params={params} />
    </Suspense>
  )
}