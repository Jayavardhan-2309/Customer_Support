// Admin Analytics Types

export type TicketStats = {
  open: number
  in_progress: number
  resolved: number
  closed: number
}

export type OverallMetrics = {
  total_tickets: number
  resolved_today: number
  resolved_this_week: number
}

export type StaffPerformance = {
  staff_id: number
  name: string
  avg_rating: number
  total_feedbacks: number
}

export type AdminAnalytics = {
  ticket_stats: TicketStats
  overall_metrics: OverallMetrics
  staff_performance: StaffPerformance[]
}

// User / Auth Types

export type Staff = {
  id: number
  username: string
  email: string
  is_available: boolean
  active_tickets: number
}

export type Me = {
  role: string
  organization_name?: string
}

export type Organization = {
  id: number
  name: string
}

// Staff Detail Types

export type StaffInfo = {
  id: number
  name: string
}

export type StaffPerformanceDetail = {
  total_tickets: number
  resolved_tickets: number
  avg_resolution_time: string | null
}

export type Feedback = {
  rating: number
  comment: string
  user: string
  ticket: string
  date: string // ISO string from Django
}

export type StaffDetail = {
  staff: StaffInfo
  performance: StaffPerformanceDetail
  feedback: Feedback[]
}

// File / PDF Types

export type PDF = {
  id: number
  title: string
  uploaded_at: string
  uploaded_by: string
  size_kb: number
}


// Staff Analytics Types

export type StaffAnalytics = {
  workload: {
    assigned: number
    open: number
    in_progress: number
    resolved: number
  }

  resolution_performance: {
    resolved_today: number
    resolved_this_week: number
    avg_resolution_hours: number | null
  }

  priority_distribution: {
    high: number
    normal: number
    low: number
  }

  category_distribution: Record<string, number>

  category_resolved: Record<string, number>

  ticket_trends: {
    date: string
    created: number
    resolved: number
    open_created: number
    in_progress_created: number
  }[]

  priority_by_status: Record<
    string,
    {
      high: number
      normal: number
      low: number
    }
  >
}
