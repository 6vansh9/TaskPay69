import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!groq) {
    return NextResponse.json({
      error: 'AI bio generation is not configured. Add GROQ_API_KEY to .env.local.',
    }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const name   = (body.name  as string | undefined)?.trim() || 'the freelancer'
  const role   = (body.role  as string | undefined)?.trim() || 'professional'
  const skills: string[] = Array.isArray(body.skills) ? body.skills : []
  const skillsText = skills.length > 0 ? skills.join(', ') : 'various technologies'

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content:
        `Write a professional 150-word freelancer bio for ${name} who is a ${role} ` +
        `with skills in ${skillsText}. ` +
        `Make it compelling, first person, professional tone. ` +
        `Do not use bullet points. Return only the bio text, no quotes or preamble.`,
    }],
    max_tokens: 300,
    temperature: 0.7,
  }).catch((err: Error) => {
    throw new Error(`Groq API error: ${err.message}`)
  })

  const text = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!text) return NextResponse.json({ error: 'No bio generated' }, { status: 500 })

  return NextResponse.json({ bio: text })
}
