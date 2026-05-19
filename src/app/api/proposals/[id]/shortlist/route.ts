import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: proposalRaw } = await supabase.from('proposals').select('job_id, is_shortlisted').eq('id', id).single()
  const proposal = proposalRaw as { job_id: string; is_shortlisted: boolean } | null
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: jobRaw } = await supabase.from('jobs').select('client_id').eq('id', proposal.job_id).single()
  const job = jobRaw as { client_id: string } | null
  if (job?.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('proposals')
    .update({ is_shortlisted: !proposal.is_shortlisted })
    .eq('id', id)
    .select('id, is_shortlisted')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
