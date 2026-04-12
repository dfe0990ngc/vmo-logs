export interface DashboardStats {
  total_ordinances: StatValue;
  total_resolutions: StatValue;
  active_sessions: StatValue;
  public_consultations: StatValue;
  pending_legislation: StatValue;
  active_members: StatValue;
}

export interface StatValue {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendData {
  month: string;
  ordinances: number;
  resolutions: number;
  sessions: number;
  consultations: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
}

export interface CommitteeActivity {
  name: string;
  ordinances: number;
  resolutions: number;
  sessions: number;
}

export interface Priority {
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Activity {
  id: number;
  user: string;
  action: string;
  subject: string;
  type: string;
  time: string;
  status: string;
}

export interface MemberAnalytic {
  member_name: string;
  total_actions: number;
  actions_breakdown: {
    authored: number;
    co_authored: number;
    approved: number;
    reviewed: number;
  };
}

export interface DashboardData {
  stats: DashboardStats;
  trends: TrendData[];
  status_distribution: StatusDistribution[];
  committee_activity: CommitteeActivity[];
  priorities: Priority[];
  recent_activities: Activity[];
  member_analytics: MemberAnalytic[];
}

export interface DashboardFilters {
  year?: string;
  month?: string;
  term?: string;
}