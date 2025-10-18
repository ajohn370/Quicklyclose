'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, Users, Check } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface AdminSetupData {
  adminExists: boolean
  canCreateAdmin: boolean
  admins: any[]
}

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [setupData, setSetupData] = useState<AdminSetupData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'super_admin' as const
  })

  // Check admin status on component mount
  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const result = await response.json()
      
      if (result.success) {
        setSetupData(result.data)
      } else {
        setError(result.message || 'Failed to check admin status')
      }
    } catch (err) {
      setError('Network error checking admin status')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          role: formData.role,
          department: 'Administration'
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        setFormData({ email: '', fullName: '', role: 'super_admin' })
        // Refresh admin status
        await checkAdminStatus()
      } else {
        setError(result.message || 'Failed to create admin user')
      }
    } catch (err) {
      setError('Network error creating admin user')
    } finally {
      setCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking admin status...</span>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          {!setupData?.adminExists ? (
            // Initial setup flow - no admins exist
            <Card className="border-2 border-blue-200">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-blue-900">
                  QuicklyClose Admin Setup
                </CardTitle>
                <CardDescription className="text-lg">
                  Create your first administrator account to manage the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert className="mb-6 border-green-200 bg-green-50">
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <AlertDescription className="text-green-800">
                        {success}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="Your full name"
                      required
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="admin@quicklyclose.com"
                      required
                      disabled={creating}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Administrator Permissions</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Manage all users and admin accounts</li>
                      <li>• Access all property data and analytics</li>
                      <li>• Configure pricing and system settings</li>
                      <li>• Export data and generate reports</li>
                    </ul>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={creating || !formData.email || !formData.fullName}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Admin Account...
                      </>
                    ) : (
                      'Create Administrator Account'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            // Admin exists - show current admins and invitation options
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle>Admin User Management</CardTitle>
                      <CardDescription>
                        Manage administrator accounts and permissions
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">Current Administrators</h3>
                    <div className="space-y-2">
                      {setupData.admins.map((admin) => (
                        <div
                          key={admin.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div>
                            <p className="font-medium">{admin.full_name}</p>
                            <p className="text-sm text-gray-600">
                              {admin.role.replace('_', ' ').toUpperCase()} • {admin.department}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {admin.is_active ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-red-600">Inactive</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {setupData.canCreateAdmin && (
                    <>
                      {error && (
                        <Alert className="mb-4 border-red-200 bg-red-50">
                          <AlertDescription className="text-red-800">
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {success && (
                        <Alert className="mb-4 border-green-200 bg-green-50">
                          <div className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <AlertDescription className="text-green-800">
                              {success}
                            </AlertDescription>
                          </div>
                        </Alert>
                      )}

                      <div className="border-t pt-6">
                        <h3 className="font-medium mb-3">Invite New Administrator</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="inviteFullName">Full Name</Label>
                              <Input
                                id="inviteFullName"
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => handleInputChange('fullName', e.target.value)}
                                placeholder="Full name"
                                disabled={creating}
                              />
                            </div>
                            <div>
                              <Label htmlFor="inviteEmail">Email Address</Label>
                              <Input
                                id="inviteEmail"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="email@company.com"
                                disabled={creating}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="role">Role</Label>
                            <select
                              id="role"
                              value={formData.role}
                              onChange={(e) => handleInputChange('role', e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={creating}
                            >
                              <option value="admin">Admin</option>
                              <option value="analyst">Analyst</option>
                              <option value="support">Support</option>
                            </select>
                          </div>

                          <Button 
                            type="submit" 
                            disabled={creating || !formData.email || !formData.fullName}
                          >
                            {creating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending Invitation...
                              </>
                            ) : (
                              'Send Admin Invitation'
                            )}
                          </Button>
                        </form>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}