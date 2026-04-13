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

interface Activity {
  id: number;
  action: string;
  entity: string;
  entity_id: number;
  description: string;
  user_name: string;
  user_type: string;
  time: string;
}

interface DashboardData {
  stats: DashboardStats;
  trends: TrendData[];
  status_distribution: StatusDistribution[];
  recent_activities: Activity[];
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

  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: '0',
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
        });

        const response = await get<DashboardData>(`/api/dashboard?${params}`);

        if (response) {
          setDashboardData(response);
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
    recent_activities,
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
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Communications */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Total Communications</CardTitle>
            <div className="bg-blue-100 p-2.5 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.total_communications.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.total_communications.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.total_communications.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.total_communications.trend === 'up' ? 'text-green-600' : stats.total_communications.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.total_communications.change > 0 ? '+' : ''}{stats.total_communications.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Received */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Received</CardTitle>
            <div className="bg-green-100 p-2.5 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.received.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.received.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.received.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.received.trend === 'up' ? 'text-green-600' : stats.received.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.received.change > 0 ? '+' : ''}{stats.received.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* For Signing */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">For Signing</CardTitle>
            <div className="bg-yellow-100 p-2.5 rounded-lg">
              <ScrollText className="w-5 h-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.for_signing.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.for_signing.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.for_signing.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.for_signing.trend === 'up' ? 'text-green-600' : stats.for_signing.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.for_signing.change > 0 ? '+' : ''}{stats.for_signing.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Signed */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Signed</CardTitle>
            <div className="bg-purple-100 p-2.5 rounded-lg">
              <Gavel className="w-5 h-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.signed.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.signed.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.signed.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.signed.trend === 'up' ? 'text-green-600' : stats.signed.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.signed.change > 0 ? '+' : ''}{stats.signed.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Released */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '400ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Released</CardTitle>
            <div className="bg-emerald-100 p-2.5 rounded-lg">
              <Eye className="w-5 h-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.released.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {stats.released.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : stats.released.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-600" /> : null}
              <span className={`font-semibold ${stats.released.trend === 'up' ? 'text-green-600' : stats.released.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.released.change > 0 ? '+' : ''}{stats.released.change}%
              </span>
              <span className="text-gray-600">from previous period</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '500ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Total Users</CardTitle>
            <div className="bg-indigo-100 p-2.5 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.total_users.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-gray-600">Total registered users</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Documents */}
        <Card className="shadow-lg hover:shadow-xl border-0 hover:scale-[1.02] transition-all animate-slide-up duration-300 cursor-pointer glass" style={{ animationDelay: '600ms' }}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-bold text-gray-800 text-sm">Total Documents</CardTitle>
            <div className="bg-cyan-100 p-2.5 rounded-lg">
              <FileText className="w-5 h-5 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-gray-900 text-3xl">{stats.total_documents.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-gray-600">Documents with attachments</span>
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
            <CardDescription className="text-gray-600">Communication activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} name="Received" />
                <Line type="monotone" dataKey="for_signing" stroke="#10b981" strokeWidth={2} name="For Signing" />
                <Line type="monotone" dataKey="signed" stroke="#8b5cf6" strokeWidth={2} name="Signed" />
                <Line type="monotone" dataKey="released" stroke="#f59e0b" strokeWidth={2} name="Released" />
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
            <CardDescription className="text-gray-600">Communications by status</CardDescription>
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

      {/* Recent Activities */}
      <Card className="shadow-lg hover:shadow-xl border-0 transition-all animate-slide-up duration-300 glass" style={{ animationDelay: '300ms' }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-bold text-gray-800 text-lg">
            <div className="bg-cyan-100 p-2 rounded-lg">
              <Cal className="w-5 h-5 text-cyan-600" />
            </div>
            Recent Activities
          </CardTitle>
          <CardDescription className="text-gray-600">Latest actions from audit log</CardDescription>
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
                      {activity.entity_id && (
                        <span className="font-medium text-gray-500 text-xs truncate">ID: {activity.entity_id}</span>
                      )}
                    </div>

                    {/* Description */}
                    {activity.description && (
                      <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">{activity.description}</p>
                    )}

                    {/* Type + timestamp */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-gray-100 border-0 font-medium text-gray-700 text-xs"
                      >
                        {activity.entity}
                      </Badge>
                      {activity.user_type && (
                        <span className="text-gray-400 text-xs capitalize">{activity.user_type}</span>
                      )}
                      <span className="text-gray-400 text-xs">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}