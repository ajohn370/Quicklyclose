'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { testN8nConnection, getN8nWorkflows } from '@/lib/n8n-integration'

interface MonitoringMetrics {
  n8nStatus: 'connected' | 'disconnected' | 'error'
  webhookStatus: 'active' | 'inactive' | 'error'
  lastExecution: string | null
  totalExecutions: number
  successRate: number
  averageResponseTime: number
  errorCount: number
  apiQuotaUsed: number
}

interface ExecutionLog {
  id: string
  timestamp: string
  status: 'success' | 'error' | 'running'
  duration: number
  imageUrl?: string
  address?: string
  error?: string
}

export function N8nMonitoringDashboard() {
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    n8nStatus: 'disconnected',
    webhookStatus: 'inactive',
    lastExecution: null,
    totalExecutions: 0,
    successRate: 0,
    averageResponseTime: 0,
    errorCount: 0,
    apiQuotaUsed: 0
  })
  
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadMetrics()
    const interval = setInterval(loadMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadMetrics = async () => {
    try {
      setRefreshing(true)
      
      // Test n8n connection
      const isConnected = await testN8nConnection()
      
      // Load workflows
      const workflows = await getN8nWorkflows()
      
      // In a real implementation, you would fetch these from your API
      // For now, we'll simulate the data
      const mockMetrics: MonitoringMetrics = {
        n8nStatus: isConnected ? 'connected' : 'disconnected',
        webhookStatus: workflows.length > 0 ? 'active' : 'inactive',
        lastExecution: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        totalExecutions: 147,
        successRate: 94.5,
        averageResponseTime: 25.3,
        errorCount: 8,
        apiQuotaUsed: 23.7
      }
      
      const mockLogs: ExecutionLog[] = [
        {
          id: 'exec_001',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          status: 'success',
          duration: 23.5,
          imageUrl: 'https://example.com/house1.jpg',
          address: '123 Main St, Albany, NY'
        },
        {
          id: 'exec_002',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          status: 'success',
          duration: 28.1,
          imageUrl: 'https://example.com/house2.jpg',
          address: '456 Oak Ave, Troy, NY'
        },
        {
          id: 'exec_003',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          status: 'error',
          duration: 0,
          error: 'Google API rate limit exceeded'
        }
      ]
      
      setMetrics(mockMetrics)
      setExecutionLogs(mockLogs)
    } catch (error) {
      console.error('Failed to load metrics:', error)
      setMetrics(prev => ({ ...prev, n8nStatus: 'error' }))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
      case 'success':
        return 'bg-green-500'
      case 'disconnected':
      case 'inactive':
      case 'error':
        return 'bg-red-500'
      case 'running':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(1)}s`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">n8n Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(metrics.n8nStatus)}`}></div>
              <span className="text-2xl font-bold capitalize">{metrics.n8nStatus}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate}%</div>
            <Progress value={metrics.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(metrics.averageResponseTime)}</div>
            <p className="text-xs text-muted-foreground mt-1">Target: &lt;30s</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.apiQuotaUsed}%</div>
            <Progress value={metrics.apiQuotaUsed} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="executions" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="executions">Recent Executions</TabsTrigger>
            <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
            <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          </TabsList>
          
          <Button 
            size="sm" 
            onClick={loadMetrics}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <TabsContent value="executions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Workflow Executions</CardTitle>
              <CardDescription>
                Latest property analysis workflows and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {executionLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(log.status)}`}></div>
                          <span className="font-medium">Execution {log.id}</span>
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      
                      {log.status === 'success' && (
                        <div className="text-sm text-muted-foreground">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-medium">Duration:</span> {formatDuration(log.duration)}
                            </div>
                            <div>
                              <span className="font-medium">Address:</span> {log.address}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {log.status === 'error' && log.error && (
                        <div className="text-sm text-red-600 mt-2">
                          <span className="font-medium">Error:</span> {log.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Executions</span>
                  <span className="font-medium">{metrics.totalExecutions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful</span>
                  <span className="font-medium text-green-600">
                    {Math.round((metrics.successRate / 100) * metrics.totalExecutions)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Failed</span>
                  <span className="font-medium text-red-600">{metrics.errorCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className="font-medium">{metrics.successRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Average Response Time</span>
                  <span className="font-medium">{formatDuration(metrics.averageResponseTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Webhook Status</span>
                  <Badge variant={metrics.webhookStatus === 'active' ? 'default' : 'secondary'}>
                    {metrics.webhookStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Last Execution</span>
                  <span className="font-medium">
                    {metrics.lastExecution 
                      ? formatTimestamp(metrics.lastExecution)
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>API Quota Used</span>
                  <span className="font-medium">{metrics.apiQuotaUsed}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
              <CardDescription>
                Common error patterns and troubleshooting information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-red-600 mb-2">Google API Rate Limits</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Occurs when the daily quota for Google Gemini API is exceeded.
                  </p>
                  <div className="text-sm">
                    <strong>Solution:</strong> Monitor API usage and implement rate limiting.
                    Consider upgrading API quota if needed.
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-red-600 mb-2">Webhook Timeout</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    n8n workflow execution exceeds the 60-second timeout limit.
                  </p>
                  <div className="text-sm">
                    <strong>Solution:</strong> Optimize workflow steps and consider async processing
                    for complex analysis operations.
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-red-600 mb-2">Image Processing Errors</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Failed to process uploaded images due to format or size issues.
                  </p>
                  <div className="text-sm">
                    <strong>Solution:</strong> Implement client-side validation and server-side
                    image optimization before sending to AI analysis.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}