import { CompVision } from '@/components/features/comp-vision'

export function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Internal tools for property analysis and management.</p>
      </div>
      <CompVision />
    </div>
  )
}