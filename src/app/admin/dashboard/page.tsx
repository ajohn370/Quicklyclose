'use client'

import { useState } from 'react'
import { AdminDashboardLayout } from '@/components/features/AdminDashboard/AdminDashboardLayout'
import { ProtectedRoute } from '@/components/features/protected-route'

// Force dynamic rendering to prevent build-time authentication issues
export const dynamic = 'force-dynamic'

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboardLayout activeTab={activeTab} onTabChange={setActiveTab} />
    </ProtectedRoute>
  )
}
