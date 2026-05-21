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
  const title    = typeof body.title    === 'string' ? body.title.trim()    : ''
  const category = typeof body.category === 'string' ? body.category.trim() : ''

  if (!title) return NextResponse.json({ error: 'title is required.' }, { status: 400 })

  const prompt = `Write a detailed job description for a ${category || 'freelance'} project called "${title}". Include: project overview, key deliverables, required skills, and timeline expectations. Professional tone, approximately 200 words. Return only the description text, no headings or labels.`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.7,
  })

  const description = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!description) return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })

  return NextResponse.json({ description })
}
