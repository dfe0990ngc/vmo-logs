export interface AuditTrail {
  id: number;
  user_id: number;
  user_name: string;
  user_type: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ACCESS' | 'EXPORT' | 'IMPORT' | 'OTHER';
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  description: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditTrailFilters {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entity_type?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface AuditTrailStatistics {
  total_actions: number;
  actions_by_type: Array<{ action: string; count: number }>;
  top_users: Array<{ user_name: string; user_type: string; count: number }>;
  activity_by_entity: Array<{ entity_type: string; count: number }>;
  recent_activity: Array<{ date: string; count: number }>;
  hourly_activity: Array<{ hour: number; count: number }>;
}

export interface FilterOptions {
  actions: string[];
  entity_types: string[];
  users: Array<{ user_id: number; user_name: string; user_type: string }>;
}
