export type Profile = {
  id: string
  email: string | null
  username: string | null
  full_name: string | null
  avatar_url: string | null
  avatar_color: string | null
  bio: string | null
  specialization: string | null
  role: 'user' | 'admin' | null
  city: string | null
  years_experience: number | null
  portfolio_url: string | null
  phone: string | null
  status: 'pending' | 'active' | 'rejected' | null
  created_at: string
  last_seen: string | null
  agreed_to_terms: boolean | null
  agreed_at: string | null
  agreed_ip: string | null
}

export type PortfolioItem = {
  id: string
  user_id: string
  title: string
  description: string | null
  image_url: string | null
  created_at: string
}

export type Job = {
  id: string
  client_id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  category: string | null
  status: 'open' | 'closed' | 'in_progress'
  created_at: string
  profiles?: Profile
}

export type Proposal = {
  id: string
  job_id: string
  user_id: string
  content: string
  price: number | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  profiles?: Profile
}

export type Channel = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type Topic = {
  id: string
  title: string
  category: string
  created_by: string
  created_at: string
  profiles?: Profile
}

export type Message = {
  id: string
  channel_id: string
  user_id: string
  content: string | null
  created_at: string
  edited_at?: string | null
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  reply_to_id?: string | null
  reply_to?: { id: string; content: string | null; user_id: string } | null
  profiles?: Profile
}

export type Notification = {
  id: string
  user_id: string
  type: string
  content: string
  link: string | null
  is_read: boolean
  created_at: string
}

export type NewsCategory = {
  id: string
  name: string
  color: string
  created_at: string
}

export type NewsItem = {
  id: string
  title: string
  content: string
  image_url: string | null
  category_id: string | null
  expires_at: string | null
  show_expiry: boolean | null
  is_archived: boolean
  created_by: string
  created_at: string
  profiles?: Profile
  news_categories?: NewsCategory | null
}

export type Asset = {
  id: string
  user_id: string
  title: string
  description: string | null
  file_url: string | null
  category: string | null
  is_free: boolean
  created_at: string
}

export type PrivateMessage = {
  id: string
  sender_id: string
  receiver_id: string
  content: string | null
  job_id: string | null
  is_read: boolean
  created_at: string
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  deleted_for_all?: boolean
  edited_at?: string | null
  reply_to_id?: string | null
  reply_to?: { id: string; content: string | null; sender_id: string } | null
  sender?: Profile
  receiver?: Profile
}

export type JobCategory = {
  id: string
  name: string
  created_at: string
}

export type ChatCategory = {
  id: string
  name: string
  created_at: string
}

export type Specialization = {
  id: string
  name: string
  created_at: string
}

export type InspirationCategory = {
  id: string
  name: string
  created_at: string
}

export type InspirationPost = {
  id: string
  user_id: string
  title: string
  description: string | null
  image_url: string
  category: string | null
  tags: string[]
  created_at: string
  profiles?: Profile
  comment_count?: number
}

export type InspirationComment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export type ContentReport = {
  id: string
  reporter_id: string
  content_type: 'message' | 'private_message' | 'forum_reply' | 'forum_thread' | 'inspiration_post'
  content_id: string
  reason: string
  status: 'pending' | 'reviewed' | 'dismissed'
  created_at: string
  reporter?: { id: string; full_name: string | null; username: string | null } | null
}

export type AssetCategory = {
  id: string
  name: string
  created_at: string
}

export type ForumCategory = {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  created_at: string
  thread_count?: number
}

export type ForumThread = {
  id: string
  category_id: string
  user_id: string
  title: string
  content: string
  images?: string[] | null
  image_url?: string | null
  tags?: string[] | null
  followers?: string[] | null
  views: number
  is_pinned: boolean
  is_locked: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
  reply_count?: number
}

export type Font = {
  id: string
  name: string
  name_hebrew: string | null
  company: string | null
  is_free: boolean
  price: string | null
  download_url: string | null
  preview_image_url: string | null
  font_file_path: string | null
  preview_hash: string | null
  category: string | null
  style: string | null
  description: string | null
  tags: string[]
  created_at: string
}

export type FontWeight = {
  id: string
  font_id: string
  weight_name: string
  preview_image_url: string | null
  download_url: string | null
  created_at: string
}

export type ForumReply = {
  id: string
  thread_id: string
  user_id: string
  content: string
  images?: string[] | null
  image_url?: string | null
  is_best_answer: boolean
  edited_at: string | null
  created_at: string
  profiles?: Profile
  like_count?: number
  user_liked?: boolean
}

export type UserBadge = {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  is_auto: boolean
  created_at: string
}

export type ProfileBadge = {
  id: string
  user_id: string
  badge_id: string
  assigned_at: string
  assigned_by: string | null
  user_badges?: UserBadge
}
