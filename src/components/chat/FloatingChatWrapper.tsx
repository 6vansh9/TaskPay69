import { createClient } from '@/lib/supabase/server'
import FloatingChat from './FloatingChat'

export default async function FloatingChatWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as { role: string } | null)?.role ?? 'freelancer'
  return <FloatingChat userId={user.id} userRole={role} />
}
