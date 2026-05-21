/**
 * Seed script — creates admin + demo accounts.
 * Run once: npx tsx scripts/create-admin.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (Settings → API → service_role key in the Supabase dashboard)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface SeedUser {
  email: string
  password: string
  role: 'admin' | 'client' | 'freelancer'
  full_name: string
  company_name?: string
  title?: string
  bio?: string
  location?: string
  industry?: string
  company_size?: string
  hire_categories?: string[]
  hire_frequency?: string
  budget_range?: string
  skills?: string[]
  hourly_rate?: number
  experience_years?: number
}

const SEED_USERS: SeedUser[] = [
  // ── Admins ────────────────────────────────────────────────────────
  {
    email: 'vansh0145@gmail.com',
    password: 'Admin@123',
    role: 'admin',
    full_name: 'Vansh (Admin)',
    title: 'Platform Administrator',
    bio: 'TaskPay platform owner and administrator.',
    location: 'India',
  },
  {
    email: 'admin@taskpay.dev',
    password: 'Admin@123',
    role: 'admin',
    full_name: 'TaskPay Admin',
    title: 'Platform Administrator',
    bio: 'TaskPay platform administrator.',
    location: 'India',
  },

  // ── Clients ───────────────────────────────────────────────────────
  {
    email: 'client1@taskpay.dev',
    password: 'Client@123',
    role: 'client',
    full_name: 'Priya Sharma',
    company_name: 'Sharma Ventures',
    location: 'Mumbai, Maharashtra',
    industry: 'Technology',
    company_size: '2–10 employees',
    hire_categories: ['Web Development', 'UI/UX Design', 'Mobile Development'],
    hire_frequency: 'regularly',
    budget_range: '₹10,000 – ₹50,000',
  },
  {
    email: 'client2@taskpay.dev',
    password: 'Client@123',
    role: 'client',
    full_name: 'Rahul Gupta',
    company_name: 'Gupta Digital',
    location: 'Delhi, Delhi',
    industry: 'E-commerce & Retail',
    company_size: '11–50 employees',
    hire_categories: ['Digital Marketing', 'Content Writing', 'Graphic Design'],
    hire_frequency: 'occasionally',
    budget_range: '₹50,000 – ₹2,00,000',
  },
  {
    email: 'client3@taskpay.dev',
    password: 'Client@123',
    role: 'client',
    full_name: 'Ananya Reddy',
    company_name: 'Reddy Tech Solutions',
    location: 'Bangalore, Karnataka',
    industry: 'Technology',
    company_size: '11–50 employees',
    hire_categories: ['Web Development', 'Data Analysis', 'DevOps & Cloud'],
    hire_frequency: 'regularly',
    budget_range: '₹2,00,000 – ₹10,00,000',
  },

  // ── Freelancers ───────────────────────────────────────────────────
  {
    email: 'dev1@taskpay.dev',
    password: 'Freelancer@123',
    role: 'freelancer',
    full_name: 'Arjun Mehta',
    title: 'Full Stack Developer | React & Node.js',
    bio: 'I am a full stack developer with 4 years of experience building scalable web applications. I specialize in React, Next.js, and Node.js. I have delivered 30+ projects for clients across e-commerce, fintech, and SaaS verticals.',
    location: 'Bangalore, Karnataka',
    skills: ['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
    hourly_rate: 1500,
    experience_years: 4,
  },
  {
    email: 'dev2@taskpay.dev',
    password: 'Freelancer@123',
    role: 'freelancer',
    full_name: 'Sneha Kulkarni',
    title: 'UI/UX Designer | Figma & Product Design',
    bio: 'I am a product designer with 3 years of experience crafting intuitive interfaces for mobile and web. My work focuses on user research, wireframing, and high-fidelity prototyping in Figma.',
    location: 'Pune, Maharashtra',
    skills: ['Figma', 'UI/UX Design', 'Product Design', 'Wireframing', 'Prototyping', 'User Research'],
    hourly_rate: 1200,
    experience_years: 3,
  },
  {
    email: 'dev3@taskpay.dev',
    password: 'Freelancer@123',
    role: 'freelancer',
    full_name: 'Vikram Singh',
    title: 'Mobile App Developer | React Native & Flutter',
    bio: 'I am a mobile developer with 5 years of experience building cross-platform apps using React Native and Flutter. I have published 10+ apps on the Play Store and App Store.',
    location: 'Hyderabad, Telangana',
    skills: ['React Native', 'Flutter', 'iOS', 'Android', 'Firebase', 'TypeScript'],
    hourly_rate: 1800,
    experience_years: 5,
  },
]

async function upsertUser(u: SeedUser) {
  // Check if user already exists
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existing = users.find(usr => usr.email === u.email)

  let userId: string

  if (existing) {
    // Update password + confirm
    await supabase.auth.admin.updateUserById(existing.id, {
      password: u.password,
      email_confirm: true,
      user_metadata: { role: u.role },
    })
    userId = existing.id
    console.log(`  ✓ Updated: ${u.email}`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { role: u.role },
    })
    if (error || !data.user) {
      console.error(`  ✗ Failed to create ${u.email}:`, error?.message)
      return
    }
    userId = data.user.id
    console.log(`  ✓ Created: ${u.email}`)
  }

  // Upsert profile
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: u.email,
    role: u.role,
    full_name: u.full_name,
    company_name: u.company_name ?? null,
    title: u.title ?? null,
    bio: u.bio ?? null,
    location: u.location ?? null,
    industry: u.industry ?? null,
    company_size: u.company_size ?? null,
    hire_categories: u.hire_categories ?? null,
    hire_frequency: u.hire_frequency ?? null,
    budget_range: u.budget_range ?? null,
    skills: u.skills ?? null,
    hourly_rate: u.hourly_rate ?? null,
    experience_years: u.experience_years ?? null,
    onboarding_complete: true,
    connects_balance: u.role === 'freelancer' ? 20 : 0,
  }, { onConflict: 'id' })

  if (profileErr) console.error(`  ✗ Profile error for ${u.email}:`, profileErr.message)
}

async function main() {
  console.log('🌱 Seeding TaskPay accounts...\n')
  for (const user of SEED_USERS) {
    await upsertUser(user)
  }
  console.log('\n✅ Done. All accounts ready.')
  console.log('\nCredentials:')
  console.log('  Admin:      vansh0145@gmail.com / Admin@123')
  console.log('  Admin:      admin@taskpay.dev   / Admin@123')
  console.log('  Clients:    client1-3@taskpay.dev / Client@123')
  console.log('  Freelancers: dev1-3@taskpay.dev  / Freelancer@123')
}

main().catch(console.error)
