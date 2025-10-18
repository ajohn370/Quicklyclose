import { SellerPortal } from '@/components/features/seller-portal'
import { Header } from '@/components/ui/header'

// Force dynamic rendering to prevent build-time authentication issues
export const dynamic = 'force-dynamic'

export default function SellerPortalPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <SellerPortal />
      </main>
    </div>
  )
}
