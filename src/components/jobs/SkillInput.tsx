'use client'

import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

const SUGGESTIONS = ['React','Next.js','TypeScript','Node.js','Python','Django','FastAPI','PostgreSQL','MongoDB','Redis','Tailwind CSS','Figma','React Native','Flutter','iOS','Android','AWS','Docker','GraphQL','REST API','UI/UX','Copywriting','SEO','WordPress','Shopify','Data Analysis','Machine Learning','TensorFlow','OpenCV','Excel','Power BI']

interface Props {
  value: string[]
  onChange: (skills: string[]) => void
  max?: number
  placeholder?: string
}

export default function SkillInput({ value, onChange, max = 10, placeholder = 'Add a skill and press Enter' }: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  const filtered = input.length > 0
    ? SUGGESTIONS.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s))
    : []

  const add = (skill: string) => {
    const trimmed = skill.trim()
    if (!trimmed || value.includes(trimmed) || value.length >= max) return
    onChange([...value, trimmed])
    setInput('')
  }

  const remove = (skill: string) => onChange(value.filter(s => s !== skill))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      add(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div className="relative">
      <div className={`min-h-[44px] flex flex-wrap gap-1.5 p-2 rounded-lg border bg-card transition-all ${focused ? 'border-[#14a800] shadow-[0_0_0_3px_rgb(20_168_0_/_0.12)]' : 'border-border'}`}>
        {value.map(skill => (
          <span key={skill} className="inline-flex items-center gap-1 bg-[#14a800/20] text-[#14a800] text-xs font-medium px-2.5 py-1 rounded-full">
            {skill}
            <button type="button" onClick={() => remove(skill)} className="hover:text-red-600 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {value.length < max && (
          <input
            className="flex-1 min-w-[140px] text-sm outline-none bg-transparent placeholder-gray-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={value.length === 0 ? placeholder : ''}
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {focused && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-md z-20 max-h-44 overflow-y-auto">
          {filtered.slice(0, 8).map(s => (
            <button
              key={s} type="button"
              onMouseDown={() => add(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-card text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-1">{value.length}/{max} skills · Press Enter or comma to add</p>
    </div>
  )
}
