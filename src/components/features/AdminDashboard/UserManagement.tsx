'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Settings, 
  Check, 
  X, 
  Loader2,
  AlertCircle
} from 'lucide-react'

interface AdminUser {
  id: string
  user_id: string
  full_name: string
  role: string
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AdminStatus {
  adminExists: boolean
  canCreateAdmin: boolean
  admins: AdminUser[]
}

export function UserManagement() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'admin',
    department: 'Administration'
  })

  useEffect(() => {
    loadAdminUsers()
  }, [])

  const loadAdminUsers = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/users', {
        cache: 'no-store'
      })
      const result = await response.json()
      
      if (result.success) {
        setAdminStatus(result.data)
      } else {
        setError(result.message || 'Failed to load admin users')
      }
    } catch (err) {
      setError('Network error loading admin users')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteAdmin = async (e: React.FormEvent) => {
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
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        setFormData({
          email: '',
          fullName: '',
          role: 'admin',
          department: 'Administration'
        })
        setIsInviteOpen(false)
        // Refresh admin list
        await loadAdminUsers()
      } else {
        setError(result.message || 'Failed to create admin user')
      }
    } catch (err) {
      setError('Network error creating admin user')
    } finally {
      setCreating(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'analyst': return 'bg-green-100 text-green-800 border-green-200'
      case 'support': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading admin users...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with invite button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Administrator Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage administrator accounts and permissions
          </p>
        </div>
        
        {adminStatus?.canCreateAdmin && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Administrator</DialogTitle>
                <DialogDescription>
                  Create a new administrator account. They will receive an email to set up their password.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleInviteAdmin} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Doe"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@company.com"
                    required
                    disabled={creating}
                  />
                </div>
                
                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={creating}
                  >
                    <option value="admin">Admin - Full system access</option>
                    <option value="analyst">Analyst - Data analysis and reporting</option>
                    <option value="support">Support - Customer support access</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Administration"
                    disabled={creating}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending Invitation...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Admin users table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Administrators</CardTitle>
          <CardDescription>
            {adminStatus?.admins.length || 0} administrator{adminStatus?.admins.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {adminStatus?.admins && adminStatus.admins.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminStatus.admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.full_name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(admin.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {formatRole(admin.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {admin.department || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.is_active ? "default" : "secondary"}>
                          {admin.is_active ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No administrators found</p>
              <p className="text-sm text-gray-400">
                Create your first administrator account to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission overview */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Overview of permissions for different administrator roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-purple-700">Super Admin</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Manage all users</li>
                <li>• System configuration</li>
                <li>• Full data access</li>
                <li>• Export capabilities</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-700">Admin</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Manage pricing</li>
                <li>• View all data</li>
                <li>• Property management</li>
                <li>• User oversight</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">Analyst</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• View analytics</li>
                <li>• Generate reports</li>
                <li>• Data analysis</li>
                <li>• Read-only access</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Support</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Customer support</li>
                <li>• Basic data access</li>
                <li>• Issue resolution</li>
                <li>• Limited permissions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}