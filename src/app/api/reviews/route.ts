import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const revieweeId = request.nextUrl.searchParams.get('reviewee_id')
  if (!revieweeId) return NextResponse.json({ error: 'reviewee_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('reviews')
    .select(`*, reviewer:reviewer_id(id, full_name, avatar_url, role)`)
    .eq('reviewee_id', revieweeId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contract_id, rating, comment, quality_rating, communication_rating, deadline_rating } = await request.json()

  if (!contract_id) return NextResponse.json({ error: 'contract_id required' }, { status: 400 })
  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 })
  if (!comment?.trim() || comment.length < 10) {
    return NextResponse.json({ error: 'Comment must be at least 10 characters' }, { status: 400 })
  }

  // Fetch contract to validate parties and completion
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, client_id, freelancer_id, status, job_id, updated_at')
    .eq('id', contract_id)
    .single()

  const c = contract as {
    id: string; client_id: string; freelancer_id: string;
    status: string; job_id: string; updated_at: string
  } | null

  if (!c) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (c.client_id !== user.id && c.freelancer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (c.status !== 'complete') {
    return NextResponse.json({ error: 'Can only review completed contracts' }, { status: 409 })
  }

  // 14-day review window
  const daysSinceComplete = (Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceComplete > 14) {
    return NextResponse.json({ error: 'Review window has closed (14 days after completion)' }, { status: 409 })
  }

  // Determine reviewer/reviewee
  const isClient = c.client_id === user.id
  const revieweeId = isClient ? c.freelancer_id : c.client_id
  const type = isClient ? 'client_to_freelancer' : 'freelancer_to_client'

  // Check duplicate
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('contract_id', contract_id)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'You already reviewed this contract' }, { status: 409 })

  const { data: review, error } = await supabase.from('reviews').insert({
    contract_id,
    job_id: c.job_id,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    rating,
    comment: comment.trim(),
    quality_rating: quality_rating ?? null,
    communication_rating: communication_rating ?? null,
    deadline_rating: deadline_rating ?? null,
    type,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify reviewee
  await supabase.from('notifications').insert({
    user_id: revieweeId,
    title: 'New review received',
    message: `You received a ${rating}-star review.`,
    type: 'review',
    link: `/contracts/${contract_id}`,
  })

  return NextResponse.json(review, { status: 201 })
}
