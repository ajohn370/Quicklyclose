'use client'

import { AdminDashboardLayout } from '@/components/features/AdminDashboard/AdminDashboardLayout'
import { Header } from '@/components/ui/header'
import AdminProtectedRoute from '@/components/features/admin-protected-route'
import { useState } from 'react'

// Force dynamic rendering to prevent build-time authentication issues
export const dynamic = 'force-dynamic'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <AdminProtectedRoute>
          <AdminDashboardLayout activeTab={activeTab} onTabChange={setActiveTab} />
        </AdminProtectedRoute>
      </main>
    </div>
  )
}
