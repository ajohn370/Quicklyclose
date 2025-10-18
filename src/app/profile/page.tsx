'use client'

import { InvestorProfile } from '@/components/features/investor-profile'
import { Header } from '@/components/ui/header'
import { ProtectedRoute } from '@/components/features/protected-route'

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <ProtectedRoute>
          <InvestorProfile />
        </ProtectedRoute>
      </main>
    </div>
  )
}