'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Home, 
  FileText,
  Download,
  Calendar,
  MapPin,
  Activity
} from 'lucide-react'

interface AnalyticsData {
  totalSubmissions: number
  submissionTrend: number
  avgPropertyValue: number
  valuationTrend: number
  activeUsers: number
  userGrowth: number
  conversionRate: number
  conversionTrend: number
  topLocations: Array<{ city: string; state: string; count: number }>
  monthlySubmissions: Array<{ month: string; count: number; value: number }>
  propertyTypes: Array<{ type: string; count: number; percentage: number }>
  recentActivity: Array<{
    id: string
    type: 'submission' | 'valuation' | 'approval' | 'analysis'
    description: string
    timestamp: string
    value?: number
  }>
}

export function ReportsSection() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadAnalytics()
  }, [selectedPeriod])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // Mock data for demonstration - in production this would be API calls
      const mockData: AnalyticsData = {
        totalSubmissions: 1247,
        submissionTrend: 12.5,
        avgPropertyValue: 285000,
        valuationTrend: -3.2,
        activeUsers: 89,
        userGrowth: 8.7,
        conversionRate: 24.3,
        conversionTrend: 5.1,
        topLocations: [
          { city: 'Atlanta', state: 'GA', count: 184 },
          { city: 'Austin', state: 'TX', count: 156 },
          { city: 'Charlotte', state: 'NC', count: 142 },
          { city: 'Nashville', state: 'TN', count: 128 },
          { city: 'Tampa', state: 'FL', count: 95 }
        ],
        monthlySubmissions: [
          { month: 'Jan', count: 89, value: 24500000 },
          { month: 'Feb', count: 124, value: 31200000 },
          { month: 'Mar', count: 156, value: 42100000 },
          { month: 'Apr', count: 203, value: 55800000 },
          { month: 'May', count: 187, value: 48900000 },
          { month: 'Jun', count: 234, value: 67200000 }
        ],
        propertyTypes: [
          { type: 'Single Family', count: 756, percentage: 60.6 },
          { type: 'Townhouse', count: 298, percentage: 23.9 },
          { type: 'Condo', count: 134, percentage: 10.7 },
          { type: 'Multi-Family', count: 59, percentage: 4.8 }
        ],
        recentActivity: [
          { id: '1', type: 'submission', description: 'New property submitted in Atlanta, GA', timestamp: '2 minutes ago', value: 285000 },
          { id: '2', type: 'valuation', description: 'AI valuation completed for Charlotte property', timestamp: '5 minutes ago', value: 342000 },
          { id: '3', type: 'approval', description: 'Admin approved pricing for Austin property', timestamp: '12 minutes ago' },
          { id: '4', type: 'analysis', description: 'Computer vision analysis completed', timestamp: '18 minutes ago' },
          { id: '5', type: 'submission', description: 'New investor inquiry from Nashville', timestamp: '25 minutes ago' }
        ]
      }
      
      setAnalytics(mockData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatTrend = (value: number) => {
    const isPositive = value > 0
    return (
      <span className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {Math.abs(value)}%
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <div className="flex gap-2">
            {['7d', '30d', '90d', '1y'].map((period) => (
              <div key={period} className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-sm text-gray-500">Business intelligence and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['7d', '30d', '90d', '1y'].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="h-7 px-3 text-xs"
              >
                {period}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSubmissions.toLocaleString()}</div>
            <div className="flex items-center justify-between mt-1">
              {formatTrend(analytics.submissionTrend)}
              <span className="text-xs text-muted-foreground">vs prev period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Property Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.avgPropertyValue)}</div>
            <div className="flex items-center justify-between mt-1">
              {formatTrend(analytics.valuationTrend)}
              <span className="text-xs text-muted-foreground">market avg</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeUsers}</div>
            <div className="flex items-center justify-between mt-1">
              {formatTrend(analytics.userGrowth)}
              <span className="text-xs text-muted-foreground">user growth</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate}%</div>
            <div className="flex items-center justify-between mt-1">
              {formatTrend(analytics.conversionTrend)}
              <span className="text-xs text-muted-foreground">submission to lead</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Submissions and total value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.monthlySubmissions.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">{item.month}</div>
                        <Progress 
                          value={(item.count / Math.max(...analytics.monthlySubmissions.map(i => i.count))) * 100} 
                          className="w-24"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{item.count} submissions</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(item.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Property Type Distribution</CardTitle>
                <CardDescription>Breakdown by property type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.propertyTypes.map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{type.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={type.percentage} className="w-20" />
                        <span className="text-sm font-medium">{type.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Top Locations</CardTitle>
              <CardDescription>Most active markets for property submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topLocations.map((location, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-sm font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{location.city}, {location.state}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {location.count} submissions
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={(location.count / analytics.topLocations[0].count) * 100} 
                      className="w-24"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Property Analysis</CardTitle>
              <CardDescription>Detailed property submission metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                Advanced property analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system activity and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                      <Activity className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{activity.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {activity.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                      </div>
                    </div>
                    {activity.value && (
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(activity.value)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}