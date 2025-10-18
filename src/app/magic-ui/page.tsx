import { MagicUIGenerator } from '@/components/features/magic-ui-generator'
import { Header } from '@/components/ui/header'

export default function MagicUIPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <MagicUIGenerator />
      </main>
    </div>
  )
}