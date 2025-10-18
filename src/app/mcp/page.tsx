import { MCPDashboard } from '@/components/features/mcp-dashboard'
import { N8nDashboard } from '@/components/features/n8n-dashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function MCPPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">MCP Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage Model Context Protocol servers and integrations
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">MCP Servers</TabsTrigger>
          <TabsTrigger value="n8n">n8n Integration</TabsTrigger>
          <TabsTrigger value="logs">Logs & Monitoring</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <MCPDashboard />
        </TabsContent>
        
        <TabsContent value="n8n" className="space-y-6">
          <N8nDashboard />
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-6">
          <div className="text-center py-12 text-muted-foreground">
            <h3 className="text-lg font-medium mb-2">Logs & Monitoring</h3>
            <p>Server logs and monitoring dashboard coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}