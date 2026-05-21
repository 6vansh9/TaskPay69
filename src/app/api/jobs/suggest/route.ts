import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const supabase = await createClient()

  // Fetch matching titles + popular skill keywords in parallel
  const [{ data: titleRows }, { data: skillRows }] = await Promise.all([
    supabase
      .from('jobs')
      .select('title')
      .eq('status', 'open')
      .ilike('title', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('jobs')
      .select('skills')
      .eq('status', 'open')
      .limit(200),
  ])

  const titleSuggestions = (titleRows ?? [])
    .map((r: { title: string }) => r.title)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .slice(0, 5)

  // Collect all skill strings that start with the query
  const allSkills: string[] = []
  for (const row of skillRows ?? []) {
    for (const s of (row.skills as string[] | null) ?? []) {
      if (s.toLowerCase().includes(q.toLowerCase())) allSkills.push(s)
    }
  }
  const skillSuggestions = [...new Set(allSkills)].slice(0, 4)

  return NextResponse.json({
    titles: titleSuggestions,
    skills: skillSuggestions,
  })
}
