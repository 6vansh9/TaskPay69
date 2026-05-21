import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!groq) return NextResponse.json({ error: 'AI not configured.' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const freelancerName: string = body.freelancer_name ?? 'the freelancer'
  const skills: string[] = Array.isArray(body.skills) ? body.skills : []
  const bio: string = body.bio ?? ''
  const jobTitle: string = body.job_title ?? 'this job'
  const jobDescription: string = body.job_description ?? ''
  const category: string = body.category ?? ''

  const skillsText = skills.length > 0 ? skills.slice(0, 8).join(', ') : 'various skills'
  const descSummary = jobDescription.length > 400
    ? jobDescription.slice(0, 400) + '…'
    : jobDescription

  const prompt =
    `Write a compelling 200-word freelancer cover letter for ${freelancerName} who has skills in ${skillsText} applying for the "${jobTitle}" job${category ? ` in the ${category} category` : ''}.` +
    (descSummary ? ` The job requires: ${descSummary}.` : '') +
    (bio ? ` Freelancer background: ${bio.slice(0, 200)}.` : '') +
    ` Make it personal, professional, and specific to this job. First person. No generic phrases. Do not use bullet points. Return only the cover letter text.`

  let completion
  try {
    completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 450,
      temperature: 0.75,
    })
  } catch {
    return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 503 })
  }

  const cover_letter = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!cover_letter) return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })

  return NextResponse.json({ cover_letter })
}
