export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type UserRole = 'client' | 'freelancer'
export type JobStatus = 'open' | 'in_progress' | 'closed'
export type JobType = 'fixed' | 'hourly'
export type ExperienceLevel = 'entry' | 'intermediate' | 'expert'
export type ProposalStatus = 'pending' | 'hired' | 'declined'
export type ContractStatus = 'active' | 'delivered' | 'complete' | 'disputed' | 'cancelled'
export type MilestoneStatus = 'pending' | 'delivered' | 'approved' | 'revision_requested' | 'disputed'
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'auto_closed'
export type TransactionType = 'escrow_fund' | 'escrow_release' | 'refund' | 'payout'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type ConversationType = 'contract' | 'pre_hire'
export type ReviewType = 'client_to_freelancer' | 'freelancer_to_client'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole | null
  title: string | null
  bio: string | null
  hourly_rate: number | null
  skills: string[] | null
  location: string | null
  is_available: boolean
  total_earnings: number
  jobs_completed: number
  rating: number
  review_count: number
  created_at: string
  updated_at: string | null
  experience_level: ExperienceLevel | null
  goals: string[] | null
  work_preference: string | null
  open_to_contract_to_hire: boolean
  profile_setup_method: string | null
  work_experience: Json
  education: Json
  languages: Json
  phone: string | null
  dob: string | null
  address: Json
  onboarding_completed: boolean
  edu_email: string | null
  edu_verified: boolean
  phone_verified: boolean
  connects_balance: number
  company_name: string | null
  industry: string | null
  website: string | null
  total_spent: number
  jobs_posted: number
  stripe_account_id: string | null
  stripe_customer_id: string | null
  notification_prefs: Json
  portfolio: Json
}

export interface Job {
  id: string
  client_id: string | null
  title: string
  description: string | null
  category: string | null
  skills_required: string[] | null
  budget_type: JobType
  budget_min: number | null
  budget_max: number | null
  experience_level: ExperienceLevel
  duration: string | null
  status: JobStatus
  bid_count: number
  proposals_count: number
  created_at: string
  completed_at: string | null
  job_type: JobType
  level: ExperienceLevel
  skills: string[]
  completion_requested_by: string | null
}

export interface Proposal {
  id: string
  job_id: string | null
  freelancer_id: string | null
  cover_letter: string
  bid_amount: number | null
  status: ProposalStatus
  created_at: string
  delivery_days: number | null
  connects_used: number
  attachment_url: string | null
  is_shortlisted: boolean
}

export interface Contract {
  id: string
  job_id: string | null
  client_id: string | null
  freelancer_id: string | null
  proposal_id: string | null
  amount: number | null
  agreed_rate: number | null
  budget_type: JobType | null
  status: ContractStatus
  created_at: string
  deadline: string | null
  completed_at: string | null
  cancelled_at: string | null
  stripe_payment_intent_id: string | null
}

export interface Milestone {
  id: string
  contract_id: string | null
  name: string
  description: string | null
  amount: number
  due_date: string | null
  status: MilestoneStatus
  revision_count: number
  delivered_at: string | null
  approved_at: string | null
  created_at: string
}

export interface Conversation {
  id: string
  job_id: string | null
  client_id: string | null
  freelancer_id: string | null
  contract_id: string | null
  type: ConversationType
  message_count: number
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string | null
  sender_id: string | null
  content: string
  attachment_url: string | null
  attachment_name: string | null
  read: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string | null
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  created_at: string
}

export interface Review {
  id: string
  job_id: string | null
  reviewer_id: string | null
  reviewee_id: string | null
  type: ReviewType
  rating: number | null
  quality_rating: number | null
  communication_rating: number | null
  deadline_rating: number | null
  comment: string | null
  freelancer_response: string | null
  response_at: string | null
  created_at: string
}

export interface Dispute {
  id: string
  contract_id: string | null
  raised_by: string | null
  reason: string
  status: DisputeStatus
  resolution: string | null
  admin_notes: string | null
  resolved_at: string | null
  created_at: string
}

export interface Transaction {
  id: string
  contract_id: string | null
  milestone_id: string | null
  payer_id: string | null
  payee_id: string | null
  amount: number
  platform_fee: number
  net_amount: number
  type: TransactionType
  status: TransactionStatus
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      jobs: { Row: Job; Insert: Partial<Job>; Update: Partial<Job> }
      proposals: { Row: Proposal; Insert: Partial<Proposal>; Update: Partial<Proposal> }
      contracts: { Row: Contract; Insert: Partial<Contract>; Update: Partial<Contract> }
      milestones: { Row: Milestone; Insert: Partial<Milestone>; Update: Partial<Milestone> }
      conversations: { Row: Conversation; Insert: Partial<Conversation>; Update: Partial<Conversation> }
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> }
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> }
      disputes: { Row: Dispute; Insert: Partial<Dispute>; Update: Partial<Dispute> }
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> }
    }
  }
}
