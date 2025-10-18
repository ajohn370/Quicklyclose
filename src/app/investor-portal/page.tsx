import { InvestorPortal } from '@/components/features/investor-portal'
import { Header } from '@/components/ui/header'
import RoleProtectedRoute from '@/components/features/role-protected-route'

// Force dynamic rendering to prevent build-time authentication issues
export const dynamic = 'force-dynamic'

export default function InvestorPortalPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <RoleProtectedRoute requiredRole="investor">
          <InvestorPortal />
        </RoleProtectedRoute>
      </main>
    </div>
  )
}
