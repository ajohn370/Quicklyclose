"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getAllMCPServers, MCPServer } from '@/lib/mcp-config'

interface MCPServerStatus {
  name: string
  status: 'running' | 'stopped' | 'error'
  uptime?: number
  lastActivity?: string
  capabilities: string[]
}

export function MCPDashboard() {
  const [servers, setServers] = useState<MCPServerStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Initialize with configured servers
    const mcpServers = getAllMCPServers()
    const initialStatus: MCPServerStatus[] = mcpServers.map(server => ({
      name: server.name,
      status: 'stopped',
      capabilities: getServerCapabilities(server.name)
    }))
    setServers(initialStatus)
  }, [])

  const getServerCapabilities = (serverName: string): string[] => {
    const capabilities: Record<string, string[]> = {
      memory: ['Entity Management', 'Knowledge Graph', 'Observations'],
      playwright: ['Web Automation', 'Screenshots', 'Form Filling'],
      github: ['Repository Management', 'Issue Tracking', 'Pull Requests'],
      'sequential-thinking': ['Chain of Thought', 'Problem Solving', 'Analysis'],
      n8n: ['Workflow Automation', 'Property Analysis', 'AI Integration', 'Zillow API', 'Google Gemini']
    }
    return capabilities[serverName] || []
  }

  const startServer = async (serverName: string) => {
    setIsLoading(true)
    
    // Simulate server startup
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setServers(prev => prev.map(server => 
      server.name === serverName 
        ? { 
            ...server, 
            status: 'running', 
            uptime: 0,
            lastActivity: new Date().toISOString()
          }
        : server
    ))
    
    setIsLoading(false)
  }

  const stopServer = async (serverName: string) => {
    setIsLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setServers(prev => prev.map(server => 
      server.name === serverName 
        ? { 
            ...server, 
            status: 'stopped',
            uptime: undefined,
            lastActivity: undefined
          }
        : server
    ))
    
    setIsLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'stopped': return 'bg-gray-100 text-gray-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const runningServers = servers.filter(s => s.status === 'running').length
  const totalServers = servers.length

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">MCP Server Dashboard</h1>
        <p className="text-gray-600">Monitor and manage Model Context Protocol servers</p>
      </div>

      {/* Overview */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running Servers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{runningServers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {Math.round((runningServers / totalServers) * 100)}%
              </div>
              <Progress value={(runningServers / totalServers) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">MCP Servers</h2>
        
        <div className="grid gap-4">
          {servers.map((server) => (
            <Card key={server.name}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {server.name}
                      <Badge className={getStatusColor(server.status)} variant="outline">
                        {server.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      MCP Server for {server.name} protocol integration
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {server.status === 'running' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => stopServer(server.name)}
                        disabled={isLoading}
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => startServer(server.name)}
                        disabled={isLoading}
                      >
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Server Info */}
                  {server.status === 'running' && (
                    <div className="flex gap-6 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Uptime:</span> {server.uptime || 0}s
                      </div>
                      <div>
                        <span className="font-medium">Last Activity:</span>{' '}
                        {server.lastActivity ? new Date(server.lastActivity).toLocaleTimeString() : 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Capabilities */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Capabilities</div>
                    <div className="flex flex-wrap gap-2">
                      {server.capabilities.map((capability) => (
                        <Badge key={capability} variant="secondary" className="text-xs">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Integration Examples */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>MCP Integration Examples</CardTitle>
          <CardDescription>
            Examples of how to integrate MCP servers in your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Memory Server Integration</h4>
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm text-gray-800">
{`// Using Memory MCP for knowledge management
import { mcp__memory__create_entities } from '@/lib/mcp-client'

const entities = await mcp__memory__create_entities({
  entities: [{
    name: "Property Lead",
    entityType: "Lead",
    observations: ["Interested in Austin properties", "Budget: $500k"]
  }]
})`}
                </pre>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Playwright Server Integration</h4>
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm text-gray-800">
{`// Using Playwright MCP for web automation
import { mcp__playwright__navigate, mcp__playwright__screenshot } from '@/lib/mcp-client'

await mcp__playwright__navigate({ url: 'https://example.com' })
const screenshot = await mcp__playwright__screenshot({ 
  name: 'property-page',
  fullPage: true 
})`}
                </pre>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">GitHub Server Integration</h4>
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm text-gray-800">
{`// Using GitHub MCP for repository management
import { mcp__github__create_issue } from '@/lib/mcp-client'

await mcp__github__create_issue({
  owner: 'quicklyclose',
  repo: 'platform',
  title: 'New Property Lead Integration',
  body: 'Implement integration for new property lead source'
})`}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}