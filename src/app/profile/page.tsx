import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Own profile → redirect to the public profile page
export default async function OwnProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  redirect(`/profile/${user.id}`)
}
