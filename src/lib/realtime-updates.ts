/**
 * Real-time Updates System
 * Handles WebSocket connections and real-time data synchronization for admin dashboard
 */

import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import * as React from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type RealtimeEventType = 'property_state_change' | 'new_submission' | 'analysis_complete' | 'job_status_change'

export interface RealtimeEvent {
  type: RealtimeEventType
  payload: any
  timestamp: string
}

export interface RealtimeSubscription {
  channel: RealtimeChannel
  unsubscribe: () => void
}

export class RealtimeUpdatesManager {
  private static channels = new Map<string, RealtimeChannel>()
  private static eventHandlers = new Map<string, Set<(event: RealtimeEvent) => void>>()

  /**
   * Subscribe to property state changes
   */
  static subscribeToPropertyUpdates(
    callback: (event: RealtimeEvent) => void,
    filters?: {
      states?: string[]
      propertyIds?: string[]
    }
  ): RealtimeSubscription {
    const channelName = 'property-updates'
    
    let channel = this.channels.get(channelName)
    if (!channel) {
      channel = supabase.channel(channelName)
      this.channels.set(channelName, channel)
    }

    // Subscribe to property changes
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'properties',
        filter: filters?.propertyIds ? `id=in.(${filters.propertyIds.join(',')})` : undefined
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const event: RealtimeEvent = {
          type: 'property_state_change',
          payload: {
            propertyId: payload.new?.id,
            oldState: (payload.old as any)?.current_state,
            newState: (payload.new as any)?.current_state,
            address: (payload.new as any)?.address,
            updatedAt: (payload.new as any)?.updated_at
          },
          timestamp: new Date().toISOString()
        }

        // Apply state filter if specified
        if (filters?.states && !filters.states.includes((payload.new as any)?.current_state)) {
          return
        }

        callback(event)
        this.notifyEventHandlers(channelName, event)
      }
    )

    // Subscribe to new property submissions
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'properties'
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const event: RealtimeEvent = {
          type: 'new_submission',
          payload: {
            propertyId: payload.new.id,
            address: payload.new.address,
            propertyType: payload.new.property_type,
            listingPrice: payload.new.listing_price,
            currentState: payload.new.current_state,
            submittedAt: payload.new.created_at
          },
          timestamp: new Date().toISOString()
        }

        callback(event)
        this.notifyEventHandlers(channelName, event)
      }
    )

    // Subscribe to state transitions
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'state_transitions'
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const event: RealtimeEvent = {
          type: 'property_state_change',
          payload: {
            propertyId: payload.new.property_id,
            oldState: payload.new.previous_state,
            newState: payload.new.new_state,
            triggeredBy: payload.new.triggered_by,
            reason: payload.new.reason,
            transitionId: payload.new.id,
            timestamp: payload.new.created_at
          },
          timestamp: new Date().toISOString()
        }

        callback(event)
        this.notifyEventHandlers(channelName, event)
      }
    )

    // Subscribe to analysis completions
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'comp_vision_analyses',
        filter: 'status=eq.completed'
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const event: RealtimeEvent = {
          type: 'analysis_complete',
          payload: {
            analysisId: payload.new.id,
            propertyId: payload.new.property_id,
            status: payload.new.status,
            confidenceScore: payload.new.confidence_score,
            estimatedValue: payload.new.estimated_value,
            completedAt: payload.new.updated_at
          },
          timestamp: new Date().toISOString()
        }

        callback(event)
        this.notifyEventHandlers(channelName, event)
      }
    )

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log('Property updates subscription status:', status)
    })

    return {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel)
        this.channels.delete(channelName)
      }
    }
  }

  /**
   * Subscribe to job queue updates
   */
  static subscribeToJobUpdates(
    callback: (event: RealtimeEvent) => void
  ): RealtimeSubscription {
    const channelName = 'job-updates'
    
    let channel = this.channels.get(channelName)
    if (!channel) {
      channel = supabase.channel(channelName)
      this.channels.set(channelName, channel)
    }

    // Subscribe to job status changes via presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const event: RealtimeEvent = {
        type: 'job_status_change',
        payload: {
          activeJobs: Object.keys(state).length,
          jobs: state
        },
        timestamp: new Date().toISOString()
      }

      callback(event)
      this.notifyEventHandlers(channelName, event)
    })

    // Subscribe to broadcast messages for job completions
    channel.on('broadcast', { event: 'job_completed' }, (payload) => {
      const event: RealtimeEvent = {
        type: 'job_status_change',
        payload: {
          jobId: payload.jobId,
          jobType: payload.jobType,
          status: 'completed',
          result: payload.result,
          completedAt: payload.completedAt
        },
        timestamp: new Date().toISOString()
      }

      callback(event)
      this.notifyEventHandlers(channelName, event)
    })

    channel.subscribe((status) => {
      console.log('Job updates subscription status:', status)
    })

    return {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel)
        this.channels.delete(channelName)
      }
    }
  }

  /**
   * Subscribe to system metrics updates
   */
  static subscribeToSystemMetrics(
    callback: (metrics: any) => void,
    intervalMs: number = 30000
  ): { unsubscribe: () => void } {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/admin/system/metrics')
        if (response.ok) {
          const data = await response.json()
          callback(data.data)
        }
      } catch (error) {
        console.error('Error fetching system metrics:', error)
      }
    }

    // Initial fetch
    fetchMetrics()

    // Set up interval
    const interval = setInterval(fetchMetrics, intervalMs)

    return {
      unsubscribe: () => {
        clearInterval(interval)
      }
    }
  }

  /**
   * Add global event handler
   */
  static addEventListener(
    channelName: string,
    handler: (event: RealtimeEvent) => void
  ): void {
    if (!this.eventHandlers.has(channelName)) {
      this.eventHandlers.set(channelName, new Set())
    }
    this.eventHandlers.get(channelName)!.add(handler)
  }

  /**
   * Remove global event handler
   */
  static removeEventListener(
    channelName: string,
    handler: (event: RealtimeEvent) => void
  ): void {
    const handlers = this.eventHandlers.get(channelName)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * Notify all event handlers
   */
  private static notifyEventHandlers(channelName: string, event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(channelName)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error('Error in event handler:', error)
        }
      })
    }
  }

  /**
   * Send job completion broadcast
   */
  static async broadcastJobCompletion(
    jobId: string,
    jobType: string,
    result: any
  ): Promise<void> {
    const channel = this.channels.get('job-updates')
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'job_completed',
        payload: {
          jobId,
          jobType,
          result,
          completedAt: new Date().toISOString()
        }
      })
    }
  }

  /**
   * Update job presence
   */
  static async updateJobPresence(
    jobId: string,
    jobType: string,
    status: 'active' | 'completed' | 'failed'
  ): Promise<void> {
    const channel = this.channels.get('job-updates')
    if (channel) {
      if (status === 'active') {
        await channel.track({
          jobId,
          jobType,
          status,
          startedAt: new Date().toISOString()
        })
      } else {
        await channel.untrack()
      }
    }
  }

  /**
   * Cleanup all subscriptions
   */
  static cleanup(): void {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
    this.eventHandlers.clear()
  }
}

/**
 * React hook for real-time property updates
 */
export function usePropertyUpdates(
  filters?: {
    states?: string[]
    propertyIds?: string[]
  }
) {
  const [events, setEvents] = React.useState<RealtimeEvent[]>([])
  const [isConnected, setIsConnected] = React.useState(false)

  React.useEffect(() => {
    const subscription = RealtimeUpdatesManager.subscribeToPropertyUpdates(
      (event) => {
        setEvents(prev => [event, ...prev].slice(0, 100)) // Keep last 100 events
      },
      filters
    )

    // Check connection status
    const checkConnection = () => {
      setIsConnected(subscription.channel.state === 'joined')
    }

    checkConnection()
    const interval = setInterval(checkConnection, 5000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [filters?.states?.join(','), filters?.propertyIds?.join(',')])

  return {
    events,
    isConnected,
    clearEvents: () => setEvents([])
  }
}

/**
 * React hook for job queue updates
 */
export function useJobQueueUpdates() {
  const [jobStatus, setJobStatus] = React.useState<any>(null)
  const [isConnected, setIsConnected] = React.useState(false)

  React.useEffect(() => {
    const subscription = RealtimeUpdatesManager.subscribeToJobUpdates(
      (event) => {
        if (event.type === 'job_status_change') {
          setJobStatus(event.payload)
        }
      }
    )

    const checkConnection = () => {
      setIsConnected(subscription.channel.state === 'joined')
    }

    checkConnection()
    const interval = setInterval(checkConnection, 5000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return {
    jobStatus,
    isConnected
  }
}

