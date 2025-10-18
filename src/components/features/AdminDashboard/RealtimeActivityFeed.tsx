'use client'

import { useState, useEffect } from 'react'
import { RealtimeUpdatesManager, RealtimeEvent } from '@/lib/realtime-updates'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, 
  FileText, 
  BarChart3, 
  ArrowRight, 
  Clock, 
  User,
  Home,
  DollarSign
} from 'lucide-react'

interface ActivityFeedProps {
  maxEvents?: number
  showTypes?: Array<'property_state_change' | 'new_submission' | 'analysis_complete' | 'job_status_change'>
}

export function RealtimeActivityFeed({ maxEvents = 50, showTypes }: ActivityFeedProps) {
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Subscribe to property updates
    const propertySubscription = RealtimeUpdatesManager.subscribeToPropertyUpdates(
      (event) => {
        if (!showTypes || showTypes.includes(event.type as any)) {
          setEvents(prev => [event, ...prev].slice(0, maxEvents))
        }
      }
    )

    // Subscribe to job updates
    const jobSubscription = RealtimeUpdatesManager.subscribeToJobUpdates(
      (event) => {
        if (!showTypes || showTypes.includes(event.type as any)) {
          setEvents(prev => [event, ...prev].slice(0, maxEvents))
        }
      }
    )

    // Monitor connection status
    const checkConnection = () => {
      const propertyConnected = propertySubscription.channel.state === 'joined'
      const jobConnected = jobSubscription.channel.state === 'joined'
      setIsConnected(propertyConnected || jobConnected)
    }

    checkConnection()
    const interval = setInterval(checkConnection, 5000)

    return () => {
      propertySubscription.unsubscribe()
      jobSubscription.unsubscribe()
      clearInterval(interval)
    }
  }, [maxEvents, showTypes?.join(',')])

  const getEventIcon = (event: RealtimeEvent) => {
    switch (event.type) {
      case 'new_submission':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'property_state_change':
        return <ArrowRight className="h-4 w-4 text-orange-500" />
      case 'analysis_complete':
        return <BarChart3 className="h-4 w-4 text-green-500" />
      case 'job_status_change':
        return <Activity className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatEventDescription = (event: RealtimeEvent): string => {
    switch (event.type) {
      case 'new_submission':
        return `New property submitted: ${event.payload.address}`
      
      case 'property_state_change':
        if (event.payload.reason) {
          return `${event.payload.address || 'Property'} moved from ${event.payload.oldState?.replace(/_/g, ' ')} to ${event.payload.newState?.replace(/_/g, ' ')}: ${event.payload.reason}`
        }
        return `${event.payload.address || 'Property'} moved from ${event.payload.oldState?.replace(/_/g, ' ')} to ${event.payload.newState?.replace(/_/g, ' ')}`
      
      case 'analysis_complete':
        const confidence = event.payload.confidenceScore ? ` (${event.payload.confidenceScore}% confidence)` : ''
        const value = event.payload.estimatedValue ? ` - Estimated: $${event.payload.estimatedValue.toLocaleString()}` : ''
        return `Analysis completed for property${confidence}${value}`
      
      case 'job_status_change':
        if (event.payload.jobType) {
          return `${event.payload.jobType.replace(/_/g, ' ')} job ${event.payload.status}`
        }
        return `Job queue update: ${event.payload.activeJobs || 0} active jobs`
      
      default:
        return 'System activity'
    }
  }

  const getEventBadgeColor = (event: RealtimeEvent): string => {
    switch (event.type) {
      case 'new_submission':
        return 'bg-blue-100 text-blue-800'
      case 'property_state_change':
        return 'bg-orange-100 text-orange-800'
      case 'analysis_complete':
        return 'bg-green-100 text-green-800'
      case 'job_status_change':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date()
    const eventTime = new Date(timestamp)
    const diffMs = now.getTime() - eventTime.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      return eventTime.toLocaleDateString()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Feed
            </CardTitle>
            <CardDescription>
              Real-time system events and property updates
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Events will appear here as they happen</p>
              </div>
            ) : (
              events.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    {getEventIcon(event)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs ${getEventBadgeColor(event)}`}>
                        {event.type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-900 break-words">
                      {formatEventDescription(event)}
                    </p>

                    {/* Additional event details */}
                    {event.type === 'new_submission' && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {event.payload.propertyType}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${event.payload.listingPrice?.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {event.type === 'analysis_complete' && event.payload.confidenceScore && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-600">Confidence:</span>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            event.payload.confidenceScore >= 90 ? 'bg-green-100 text-green-800' :
                            event.payload.confidenceScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {event.payload.confidenceScore}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}