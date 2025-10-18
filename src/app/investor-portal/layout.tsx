import { PortalGuard } from '@/components/auth/portal-guard'

export default function InvestorPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalGuard requiredRole="investor" portalName="Investor Portal">
      {children}
    </PortalGuard>
  )
}