'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getN8nWorkflows, testN8nConnection } from '@/lib/n8n-integration'

interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  nodes: any[]
  connections: any
  createdAt: string
  updatedAt: string
}

export function N8nDashboard() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'disconnected'>('testing')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
    loadWorkflows()
  }, [])

  const checkConnection = async () => {
    try {
      setConnectionStatus('testing')
      const isConnected = await testN8nConnection()
      setConnectionStatus(isConnected ? 'connected' : 'disconnected')
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('disconnected')
    }
  }

  const loadWorkflows = async () => {
    try {
      setLoading(true)
      setError(null)
      const workflowList = await getN8nWorkflows()
      setWorkflows(workflowList)
    } catch (error) {
      console.error('Failed to load workflows:', error)
      setError('Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>n8n Integration Status</CardTitle>
              <CardDescription>
                Monitor n8n server connection and workflow status
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {getConnectionBadge()}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={checkConnection}
                disabled={connectionStatus === 'testing'}
              >
                Test Connection
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Base URL</div>
              <div className="text-muted-foreground">
                {process.env.NEXT_PUBLIC_N8N_BASE_URL || 'http://localhost:5678'}
              </div>
            </div>
            <div>
              <div className="font-medium">Webhook URL</div>
              <div className="text-muted-foreground truncate">
                {process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ? 'Configured' : 'Not set'}
              </div>
            </div>
            <div>
              <div className="font-medium">MCP Status</div>
              <div className="text-muted-foreground">
                <Badge variant="outline">Docker</Badge>
              </div>
            </div>
            <div>
              <div className="font-medium">Total Workflows</div>
              <div className="text-muted-foreground">{workflows.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Workflows</CardTitle>
              <CardDescription>
                n8n workflows configured for QuicklyClose integration
              </CardDescription>
            </div>
            <Button size="sm" onClick={loadWorkflows} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{error}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadWorkflows}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? 'Loading workflows...' : 'No workflows found'}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{workflow.name}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={workflow.active ? "default" : "secondary"}>
                          {workflow.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          {workflow.nodes?.length || 0} nodes
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">ID:</span> {workflow.id}
                        </div>
                        <div>
                          <span className="font-medium">Updated:</span> {formatDate(workflow.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* QuicklyClose Integration */}
      <Card>
        <CardHeader>
          <CardTitle>QuicklyClose Property Analysis</CardTitle>
          <CardDescription>
            Integration status for property analysis workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Workflow Components</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Webhook trigger for property data</li>
                  <li>• Google Gemini 2.5 Pro image analysis</li>
                  <li>• Zillow API market data lookup</li>
                  <li>• Investment metrics calculation</li>
                  <li>• Comparable properties analysis</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Integration Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Webhook URL</span>
                    <Badge variant={process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ? "default" : "secondary"}>
                      {process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ? 'Configured' : 'Not set'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">API Integration</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">MCP Server</span>
                    <Badge variant="outline">Docker</Badge>
                  </div>
                </div>
              </div>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Usage:</strong> Property analysis requests from the comp-vision portal 
                are automatically sent to the n8n workflow via webhook. Results are processed 
                and returned with AI-powered insights and market data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}