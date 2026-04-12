import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar } from 'recharts';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar as Cal,
  Eye,
  Scale,
  Users,
  Gavel,
  ScrollText,
  MessageSquare,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { get } from '@/api/requests';

interface DashboardStats {
  total_communications: StatValue;
  received: StatValue;
  for_signing: StatValue;
  signed: StatValue;
  released: StatValue;
  total_users: StatValue;
  total_documents: StatValue;
}

interface StatValue {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface TrendData {
  month: string;
  received: number;
  for_signing: number;
  signed: number;
  released: number;
}

interface StatusDistribution {
  name: string;
  value: number;
}

interface CommitteeActivity {
  name: string;
  ordinances: number;
  resolutions: number;
  sessions: number;
}

interface Priority {
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface Activity {
  id: number;
  type: string;         // 'ordinance' | 'resolution' | 'session' | 'forum'
  entity_id: string;
  number: string;       // entity_name from audit_trails
  subject: string;      // description from audit_trails
  action: string;       // 'create' | 'update' | 'delete' etc.
  user_name: string;
  user_type: string;
  time: string;
  status: string;
}

interface MemberAnalytic {
  member_name: string;
  total_actions: number;
  actions_breakdown: {
    authored: number;
    co_authored: number;
    approved: number;
    reviewed: number;
  };
}

interface DashboardData {
  stats: DashboardStats;
  trends: TrendData[];
  status_distribution: StatusDistribution[];
  committee_activity?: CommitteeActivity[];
  priorities?: Priority[];
  recent_activities: Activity[];
  member_analytics?: MemberAnalytic[];
}

// Map audit action strings to readable labels
const actionLabel: Record<string, string> = {
  CREATE: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
  LOGIN: 'logged in',
  LOGOUT: 'logged out',
  ACCESS: 'accessed',
  EXPORT: 'exported',
  IMPORT: 'imported',
  OTHER: 'performed',
};

// Initials from a full name string
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
};

// Color per entity type
const typeBadgeClass: Record<string, string> = {
  ordinance:  'bg-blue-100 text-blue-800',
  resolution: 'bg-green-100 text-green-800',
  session:    'bg-purple-100 text-purple-800',
  forum:      'bg-orange-100 text-orange-800',
};

// Color per audit action
const actionBadgeClass: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-sky-100 text-sky-700',
  LOGOUT: 'bg-slate-100 text-slate-700',
  ACCESS: 'bg-indigo-100 text-indigo-700',
  EXPORT: 'bg-cyan-100 text-cyan-700',
  IMPORT: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMemberAnalytics, setActiveMemberAnalytics] = useState<MemberAnalytic | null>(null);

  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: '0',
    term: '0',
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          year: filters.year,
          month: filters.month,
          term: filters.term,
        });

        const response = await get<DashboardData>(`/api/dashboard?${params}`);

        if (response) {
          setDashboardData(response);

          if (response.member_analytics && response.member_analytics.length > 0) {
            setActiveMemberAnalytics(response.member_analytics[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [filters]);

  // Generate year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [{ value: 'all', label: 'All Years' }];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push({ value: i.toString(), label: i.toString() });
    }
    return years;
  }, []);

  // Month options
  const monthOptions = [
    { value: '0', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const actionBreakdownColors: Record<string, string> = {
    authored: '#3b82f6',
    co_authored: '#10b981',
    approved: '#f59e0b',
    reviewed: '#8b5cf6',
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 w-12 h-12 text-red-600" />
          <p className="mb-4 font-semibold text-gray-800 text-lg">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const {
    stats,
    trends,
    status_distribution,
    committee_activity = [],
    priorities = [],
    recent_activities,
    member_analytics = [],
  } = dashboardData;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Filters */}
      <Card className="shadow-lg hover:shadow-xl border-0 transition-all duration-300 glass">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-bold text-gray-800 text-lg">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Cal className="w-5 h-5 text-blue-600" />
            </div>
            Filter Dashboard
          </CardTitle>
          <CardDescription className="text-gray-600">
            Customize your view by selecting time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex sm:flex-row flex-col justify-end items-center gap-4">
            <div className="flex-1 space-y-2 w-full sm:max-w-48">
              <Label htmlFor="year" className="font-medium text-gray-700">Year</Label>
              <Select value={filters.year} onValueChange={(value) => setFilters({ ...filters, year: value })}>
                <SelectTrigger id="year" className="bg-white">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {yearOptions.map((option) => (
                    <SelectItem key={'year-options-' + option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2 w-full sm:max-w-48">
              <Label htmlFor="month" className="font-medium text-gray-700">Month</Label>
              <Select value={filters.month} onValueChange={(value) => setFilters({ ...filters, month: value })}>
                <SelectTrigger id="month" className="bg-white">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {monthOptions.map((option) => (
                    <SelectItem key={'month-options-' + option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2 w-full sm:max-w-48">
              <Label htmlFor="term" className="font-medium text-gray-700">Term</Label>
              <Select value={filters.term} onValueChange={(value) => setFilters({ ...filters, term: value })}>
                <SelectTrigger id="term" className="bg-white">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Terms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Ordinances */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Total Ordinances</CardTitle>
            <div className="bg-blue-100 p-2.5 rounded-lg">
              <Scale className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.total_ordinances.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.total_ordinances.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.total_ordinances.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.total_ordinances.trend === 'up' ? 'text-green-600' : stats.total_ordinances.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.total_ordinances.change > 0 ? '+' : ''}{stats.total_ordinances.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Resolutions */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Total Resolutions</CardTitle>
            <div className="bg-green-100 p-2.5 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.total_resolutions.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.total_resolutions.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.total_resolutions.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.total_resolutions.trend === 'up' ? 'text-green-600' : stats.total_resolutions.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.total_resolutions.change > 0 ? '+' : ''}{stats.total_resolutions.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Sessions</CardTitle>
            <div className="bg-purple-100 p-2.5 rounded-lg">
              <Gavel className="w-5 h-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.active_sessions.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.active_sessions.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.active_sessions.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.active_sessions.trend === 'up' ? 'text-green-600' : stats.active_sessions.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.active_sessions.change > 0 ? '+' : ''}{stats.active_sessions.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Public Consultations */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Public Consultations</CardTitle>
            <div className="bg-orange-100 p-2.5 rounded-lg">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.public_consultations.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.public_consultations.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.public_consultations.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.public_consultations.trend === 'up' ? 'text-green-600' : stats.public_consultations.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.public_consultations.change > 0 ? '+' : ''}{stats.public_consultations.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Legislation */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '400ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Pending Legislation</CardTitle>
            <div className="bg-yellow-100 p-2.5 rounded-lg">
              <ScrollText className="w-5 h-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.pending_legislation.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.pending_legislation.trend === 'up' ? <TrendingUp className="w-4 h-4 text-red-600" /> : stats.pending_legislation.trend === 'down' ? <TrendingDown className="w-4 h-4 text-green-600" /> : null}
              <span className={`font-semibold ${stats.pending_legislation.trend === 'up' ? 'text-red-600' : stats.pending_legislation.trend === 'down' ? 'text-green-600' : 'text-gray-600'}`}>
                {stats.pending_legislation.change > 0 ? '+' : ''}{stats.pending_legislation.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Committees */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '500ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Active Committees</CardTitle>
            <div className="bg-indigo-100 p-2.5 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.active_committees.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-gray-600">Total active committees</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
        {/* Monthly Trends */}
        <Card className="shadow-lg hover:shadow-xl border-0 transition-all animate-slide-up duration-300 glass" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-bold text-gray-800 text-lg">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              Monthly Trends
            </CardTitle>
            <CardDescription className="text-gray-600">Legislative activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="ordinances"   stroke="#3b82f6" strokeWidth={2} name="Ordinances" />
                <Line type="monotone" dataKey="resolutions"  stroke="#10b981" strokeWidth={2} name="Resolutions" />
                <Line type="monotone" dataKey="sessions"     stroke="#8b5cf6" strokeWidth={2} name="Sessions" />
                <Line type="monotone" dataKey="consultations" stroke="#f59e0b" strokeWidth={2} name="Consultations" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-lg hover:shadow-xl border-0 transition-all animate-slide-up duration-300 glass" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-bold text-gray-800 text-lg">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              Status Distribution
            </CardTitle>
            <CardDescription className="text-gray-600">Legislation by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={status_distribution}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {status_distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Committee Activity & Priorities */}
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
        {/* Committee Activity */}
        <Card className="shadow-lg hover:shadow-xl border-0 transition-all animate-slide-up duration-300 glass" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-bold text-gray-800 text-lg">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              Committee Activity
            </CardTitle>
            <CardDescription className="text-gray-600">Top committees by legislation</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={committee_activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="ordinances"  fill="#3b82f6" name="Ordinances" />
                <Bar dataKey="resolutions" fill="#10b981" name="Resolutions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Legislative Priorities */}
        <Card className="shadow-lg hover:shadow-xl border-0 transition-all animate-slide-up duration-300 glass" style={{ animationDelay: '400ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-bold text-gray-800 text-lg">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-yellow-600" />
              </div>
              Legislative Priorities
            </CardTitle>
            <CardDescription className="text-gray-600">Focus areas by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {priorities.map((priority, index) => (
                <div key={'priorities-' + index} className="space-y-2 animate-slide-in-stagger" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{priority.category}</span>
                      {priority.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {priority.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    </div>
                    <span className="text-gray-600 text-sm">{priority.count} items</span>
                  </div>
                  <div className="relative bg-gray-200 rounded-full w-full h-3 overflow-hidden">
                    <div
                      className="top-0 left-0 absolute bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-full transition-all duration-500"
                      style={{ width: `${priority.percentage}%` }}
                    />
                  </div>
                  <span className="font-medium text-gray-500 text-xs">{priority.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="shadow-lg hover:shadow-xl border-0 transition-all animate-slide-up duration-300 glass" style={{ animationDelay: '500ms' }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-bold text-gray-800 text-lg">
            <div className="bg-cyan-100 p-2 rounded-lg">
              <Cal className="w-5 h-5 text-cyan-600" />
            </div>
            Recent Activities
          </CardTitle>
          <CardDescription className="text-gray-600">Latest legislative actions from audit log</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {recent_activities.length === 0 ? (
            <p className="py-8 text-gray-400 text-sm text-center">No recent activity found.</p>
          ) : (
            <div className="space-y-4">
              {recent_activities.map((activity, index) => (
                <div
                  key={'recent-activities-' + activity.id + '-' + index}
                  className="flex items-start gap-4 bg-gradient-to-r from-white to-gray-50/30 shadow-sm hover:shadow-md p-4 border-0 rounded-xl hover:scale-[1.01] transition-all animate-slide-in-stagger duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Avatar — initials from user_name */}
                  <Avatar className="flex-shrink-0 ring-2 ring-gray-200 w-11 h-11">
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 font-semibold text-blue-800 text-xs">
                      {getInitials(activity.user_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    {/* Who did what */}
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-semibold text-gray-800 truncate">{activity.user_name}</span>
                      <Badge variant="outline" className={`text-xs font-medium border-0 ${actionBadgeClass[activity.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {actionLabel[activity.action] ?? activity.action}
                      </Badge>
                      {activity.number && (
                        <span className="font-medium text-gray-500 text-xs truncate">#{activity.number}</span>
                      )}
                    </div>

                    {/* Description */}
                    {activity.subject && (
                      <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">{activity.subject}</p>
                    )}

                    {/* Type + timestamp */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border-0 ${typeBadgeClass[activity.type] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {activity.type}
                      </Badge>
                      {activity.user_type && (
                        <span className="text-gray-400 text-xs capitalize">{activity.user_type}</span>
                      )}
                      <span className="text-gray-400 text-xs">{activity.time}</span>
                    </div>
                  </div>

                  {/* Navigate to entity list */}
                  <Button
                    onClick={() => navigate(`/admin/legislatives/${activity.type}s`)}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 hover:bg-blue-100 rounded-lg w-8 h-8 hover:text-blue-700 transition-colors duration-200 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Analytics */}
      {member_analytics.length > 0 && (
        <Card className="shadow-lg hover:shadow-xl border-0 transition-all animate-slide-up duration-300 glass" style={{ animationDelay: '600ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-bold text-gray-800 text-lg">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              Member Activity Analytics
            </CardTitle>
            <CardDescription className="text-gray-600">Legislative activity by member</CardDescription>
          </CardHeader>
          <CardContent className="gap-6 grid grid-cols-1 md:grid-cols-3 px-3 sm:px-6">
            <div className="md:col-span-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={member_analytics}
                  onMouseMove={(state) => {
                    if (state.isTooltipActive && state.activePayload && state.activePayload[0]) {
                      setActiveMemberAnalytics(state.activePayload[0].payload);
                    }
                  }}
                  onMouseLeave={() => setActiveMemberAnalytics(member_analytics[0])}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="member_name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Line
                    type="monotone"
                    dataKey="total_actions"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Total Actions"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {activeMemberAnalytics && (
              <div className="flex flex-col justify-center items-center space-y-4">
                <h4 className="font-bold text-gray-800 text-center">{activeMemberAnalytics.member_name}'s Breakdown</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={Object.entries(activeMemberAnalytics.actions_breakdown).map(([name, value]) => ({
                        name: name.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                        value,
                      }))
                      cx="50%" cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {Object.keys(activeMemberAnalytics.actions_breakdown).map((key, index) => (
                        <Cell key={`cell-${index}`} fill={actionBreakdownColors[key] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 w-full">
                  {Object.entries(activeMemberAnalytics.actions_breakdown).map(([key, value]) => (
                    <div key={'active-member-analytics-' + key} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full w-3 h-3" style={{ backgroundColor: actionBreakdownColors[key] }}></div>
                        <span className="font-medium text-gray-700 capitalize">{key.replace('_', ' ')}</span>
                      </div>
                      <span className="font-bold text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}