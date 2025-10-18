'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { MockRBACManager as RBACManager, Permission } from '@/lib/admin-rbac-mock'
import { MockConfigurationManager as ConfigurationManager } from '@/lib/admin-config-mock'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, Activity, Settings, Users, FileText, BarChart3, Database } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { RealtimeActivityFeed } from './RealtimeActivityFeed'
import { PricingDashboard } from './PricingDashboard'
import { UserManagement } from './UserManagement'
import { ReportsSection } from './ReportsSection'
import { AIResponsesSection } from './AIResponsesSection'
import { SubmissionsSection } from './SubmissionsSection'
import { AdminMessaging } from './AdminMessaging'

interface DashboardStats {
  pendingSubmissions: number
  underReview: number
  activeAnalyses: number
  completedToday: number
  queueSize: number
  systemHealth: 'healthy' | 'warning' | 'error'
}

interface AdminDashboardLayoutProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export function AdminDashboardLayout({ activeTab = 'overview', onTabChange }: AdminDashboardLayoutProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [permissions, setPermissions] = useState<{
    rolePermissions: Permission[]
    userOverrides: any[]
    effectivePermissions: string[]
  } | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'error'>('healthy')
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  useEffect(() => {
    if (user) {
      checkAdminAccess()
      loadDashboardStats()
      loadSystemStatus()
    }
  }, [user])

  const checkAdminAccess = async () => {
    if (!user) return

    try {
      const [hasAdminAccess, userPermissions] = await Promise.all([
        RBACManager.hasPermission(user.id, 'admin.dashboard.view'),
        RBACManager.getUserPermissions(user.id)
      ])

      setHasAccess(hasAdminAccess)
      setPermissions(userPermissions)
    } catch (error) {
      console.error('Error checking admin access:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    }
  }

  const loadSystemStatus = async () => {
    try {
      const [maintenanceModeEnabled, systemHealthResponse] = await Promise.all([
        ConfigurationManager.getConfig('system.maintenance_mode', false),
        fetch('/api/admin/system/health', {
          cache: 'no-store'
        })
      ])

      setMaintenanceMode(maintenanceModeEnabled)
      
      if (systemHealthResponse.ok) {
        const healthData = await systemHealthResponse.json()
        setSystemHealth(healthData.data.status)
      }
    } catch (error) {
      console.error('Error loading system status:', error)
      setSystemHealth('error')
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!permissions || !permissions.effectivePermissions) return false
    return permissions.effectivePermissions.includes(permission)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don&apos;t have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.history.back()} variant="outline" className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Manage property submissions, pricing, and system configuration
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* System Status */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  systemHealth === 'healthy' ? 'bg-green-500' : 
                  systemHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-xs sm:text-sm text-gray-600 capitalize">{systemHealth}</span>
              </div>

              {/* Maintenance Mode Alert */}
              {maintenanceMode && (
                <Badge variant="destructive" className="text-xs">Maintenance Mode</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Mode Warning */}
      {maintenanceMode && (
        <div className="px-4 sm:px-6">
          <Alert className="mt-4 max-w-7xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              System is in maintenance mode. New submissions are paused and some features may be limited.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.pendingSubmissions}</div>
                <p className="text-xs text-muted-foreground hidden sm:block">Awaiting initial review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Reviewing</CardTitle>
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.underReview}</div>
                <p className="text-xs text-muted-foreground hidden sm:block">Currently being analyzed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.activeAnalyses}</div>
                <p className="text-xs text-muted-foreground hidden sm:block">Processing now</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Queue</CardTitle>
                <Database className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.queueSize}</div>
                <p className="text-xs text-muted-foreground hidden sm:block">Jobs in queue</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-full md:min-w-0">
              <TabsTrigger value="overview" className="whitespace-nowrap px-3 py-1.5 text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="submissions" disabled={!hasPermission('properties.manage')} className="whitespace-nowrap px-3 py-1.5 text-sm">
                Submissions
              </TabsTrigger>
              <TabsTrigger value="pricing" disabled={!hasPermission('pricing.manage')} className="whitespace-nowrap px-3 py-1.5 text-sm">
                Pricing
              </TabsTrigger>
              <TabsTrigger value="messages" className="whitespace-nowrap px-3 py-1.5 text-sm">
                Messages
              </TabsTrigger>
              <TabsTrigger value="users" disabled={!hasPermission('users.manage')} className="whitespace-nowrap px-3 py-1.5 text-sm">
                Users
              </TabsTrigger>
              <TabsTrigger value="system" disabled={!hasPermission('system.manage')} className="whitespace-nowrap px-3 py-1.5 text-sm">
                System
              </TabsTrigger>
              <TabsTrigger value="reports" disabled={!hasPermission('reports.view')} className="whitespace-nowrap px-3 py-1.5 text-sm">
                Reports
              </TabsTrigger>
              <TabsTrigger value="ai-responses" disabled={!hasPermission('system.manage')} className="whitespace-nowrap px-3 py-1.5 text-sm">
                AI Responses
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealtimeActivityFeed maxEvents={25} />

              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>Real-time system metrics and health</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Queue Health</span>
                      <Badge className={`${
                        systemHealth === 'healthy' ? 'bg-green-100 text-green-800' :
                        systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {systemHealth}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Jobs</span>
                      <span className="text-sm font-mono">{stats?.queueSize || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Completed Today</span>
                      <span className="text-sm font-mono">{stats?.completedToday || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Processing Rate</span>
                      <span className="text-sm text-green-600">
                        {stats?.activeAnalyses || 0} active
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="submissions">
            <SubmissionsSection />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingDashboard />
          </TabsContent>
          
          <TabsContent value="messages">
            <AdminMessaging />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Manage system settings, feature flags, and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">System configuration interface coming soon...</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <ReportsSection />
          </TabsContent>

          <TabsContent value="ai-responses">
            <AIResponsesSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
