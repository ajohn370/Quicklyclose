import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'

// Service role client specifically for admin operations
// This bypasses RLS policies that cause infinite recursion on admin_profiles
// Note: Requires SUPABASE_SERVICE_ROLE_KEY environment variable in production
// Updated: Force Vercel cache refresh for build deployment
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}