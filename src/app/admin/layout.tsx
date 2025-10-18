import { PortalGuard } from '@/components/auth/portal-guard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalGuard requiredRole="admin" portalName="Admin Dashboard">
      {children}
    </PortalGuard>
  )
}