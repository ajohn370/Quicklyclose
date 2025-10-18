import { redirect } from 'next/navigation'

export default function RootPage() {
  // Server-side redirect for better Vercel compatibility
  redirect('/marketing')
}
