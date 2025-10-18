'use client'

import { useEffect } from 'react'

export function ChunkErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections (chunk loading errors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason

      // Check if it's a chunk loading error
      if (
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Loading CSS chunk') ||
        error?.message?.includes('failed to fetch')
      ) {
        console.warn('Chunk loading error detected, reloading page...', error)
        
        // Prevent default error handling
        event.preventDefault()
        
        // Clear any cached chunks and reload
        if (typeof window !== 'undefined' && 'caches' in window) {
          caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
              if (cacheName.includes('_next') || cacheName.includes('static')) {
                caches.delete(cacheName)
              }
            })
          }).finally(() => {
            if (typeof window !== 'undefined') {
              (window as any).location?.reload()
            }
          })
        } else {
          // Fallback: just reload
          if (typeof window !== 'undefined') {
            (window as any).location?.reload()
          }
        }
      }
    }

    // Handle general errors that might be chunk-related
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      
      if (
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Loading CSS chunk')
      ) {
        console.warn('Chunk loading error in global handler, reloading page...', error)
        if (typeof window !== 'undefined') {
          (window as any).location?.reload()
        }
      }
    }

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // Add a check for dynamic imports that might fail
  useEffect(() => {
    // Override the global fetch to catch network errors
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch
      
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args)
          
          // Check if it's a chunk request that failed
          const url = args[0]?.toString() || ''
          if (url.includes('/_next/static/chunks/') && !response.ok) {
            console.warn('Chunk fetch failed, reloading page...', url, response.status)
            if (typeof window !== 'undefined') {
              (window as any).location?.reload()
            }
          }
          
          return response
        } catch (error) {
          // Network error - might be chunk loading
          const url = args[0]?.toString() || ''
          if (url.includes('/_next/static/chunks/')) {
            console.warn('Chunk network error, reloading page...', url, error)
            if (typeof window !== 'undefined') {
              (window as any).location?.reload()
            }
          }
          throw error
        }
      }

      // Restore original fetch on cleanup
      return () => {
        window.fetch = originalFetch
      }
    }
  }, [])

  return null // This component doesn't render anything
}