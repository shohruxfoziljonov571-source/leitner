import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, TrendingUp, Calendar, 
  BarChart3, MessageSquare, Link2, Shield, Trophy, Send,
  Award, Clock, HeadphonesIcon, Crown, FileAudio, Book, DollarSign, Filter, Sparkles,
  ChevronRight, LayoutDashboard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAdmin } from '@/hooks/useAdmin';
import ContestManager from '@/components/admin/ContestManager';
import BroadcastMessage from '@/components/admin/BroadcastMessage';
import UserManagement from '@/components/admin/UserManagement';
import AdvancedStatistics from '@/components/admin/AdvancedStatistics';
import AchievementManager from '@/components/admin/AchievementManager';
import ScheduledMessages from '@/components/admin/ScheduledMessages';
import FeedbackSupport from '@/components/admin/FeedbackSupport';
import LeaderboardManager from '@/components/admin/LeaderboardManager';
import DictationManager from '@/components/admin/DictationManager';
import BookManager from '@/components/admin/BookManager';
import PaymentManager from '@/components/admin/PaymentManager';
import FunnelAnalytics from '@/components/admin/FunnelAnalytics';
import OnboardingWizard from '@/components/admin/OnboardingWizard';
import ChannelManager from '@/components/admin/ChannelManager';
import ReferralManager from '@/components/admin/ReferralManager';
import MetaPixelManager from '@/components/admin/MetaPixelManager';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

// ── Navigation config ──────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Umumiy',
    items: [
      { id: 'analytics', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'users', label: 'Foydalanuvchilar', icon: Users },
      { id: 'payments', label: "To'lovlar", icon: DollarSign },
    ],
  },
  {
    title: 'Kontent',
    items: [
      { id: 'achievements', label: 'Yutuqlar', icon: Award },
      { id: 'dictations', label: 'Diktantlar', icon: FileAudio },
      { id: 'books', label: 'Kitoblar', icon: Book },
      { id: 'contests', label: 'Konkurslar', icon: Trophy },
      { id: 'leaderboard', label: 'Reyting', icon: Crown },
    ],
  },
  {
    title: 'Xabarlar',
    items: [
      { id: 'broadcast', label: 'Xabar yuborish', icon: Send },
      { id: 'scheduled', label: 'Rejali xabarlar', icon: Clock },
      { id: 'feedback', label: 'Murojaatlar', icon: HeadphonesIcon },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { id: 'channels', label: 'Kanallar', icon: MessageSquare },
      { id: 'referrals', label: 'Referrallar', icon: Link2 },
      { id: 'funnel', label: 'Funnel', icon: Filter },
    ],
  },
  {
    title: 'Sozlamalar',
    items: [
      { id: 'setup', label: 'Onboarding', icon: Sparkles },
      { id: 'stats', label: 'Batafsil statistika', icon: TrendingUp },
    ],
  },
];

// ── Sidebar nav component ──────────────────────────────
const AdminNav = ({ active, onChange }: { active: string; onChange: (id: string) => void }) => (
  <nav className="space-y-4">
    {NAV_GROUPS.map((group) => (
      <div key={group.title}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-2">
          {group.title}
        </p>
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </nav>
);

// ── Mobile nav (horizontal chips) ──────────────────────
const AdminNavMobile = ({ active, onChange }: { active: string; onChange: (id: string) => void }) => {
  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  return (
    <ScrollArea className="w-full pb-1">
      <div className="flex gap-1.5 px-1 w-max">
        {allItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

// ── Analytics section ──────────────────────────────────
const AnalyticsDashboard = ({ stats, dailyStats }: { stats: any; dailyStats: any[] }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
  };

  const statCards = [
    { label: 'Jami foydalanuvchilar', value: stats?.totalUsers || 0, icon: Users, color: 'text-primary bg-primary/10' },
    { label: 'Bugun faol', value: stats?.activeToday || 0, icon: TrendingUp, color: 'text-green-500 bg-green-500/10' },
    { label: 'Jami so\'zlar', value: stats?.totalWords || 0, icon: BookOpen, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Yangi (7 kun)', value: stats?.newUsersThisWeek || 0, icon: Calendar, color: 'text-purple-500 bg-purple-500/10' },
    { label: "O'rtacha so'z/user", value: stats?.avgWordsPerUser || 0, icon: BarChart3, color: 'text-orange-500 bg-orange-500/10' },
    { label: 'Jami takrorlar', value: stats?.totalReviews || 0, icon: TrendingUp, color: 'text-pink-500 bg-pink-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Kunlik foydalanuvchilar (14 kun)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStats}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="bg-popover p-3 rounded-lg shadow-lg border">
                    <p className="font-medium">{formatDate(label)}</p>
                    <p className="text-sm text-muted-foreground">Yangi foydalanuvchilar: {payload[0]?.value}</p>
                  </div>
                ) : null} />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Takrorlar va yangi so'zlar</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="bg-popover p-3 rounded-lg shadow-lg border">
                    <p className="font-medium">{formatDate(label)}</p>
                    <p className="text-sm text-green-500">Takrorlar: {payload[0]?.value}</p>
                    <p className="text-sm text-blue-500">Yangi so'zlar: {payload[1]?.value}</p>
                  </div>
                ) : null} />
                <Bar dataKey="reviews" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="newWords" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ── Main Admin Page ────────────────────────────────────
const Admin = () => {
  const { 
    isAdmin, isLoading, stats, channels, referrals, dailyStats,
    addChannel, toggleChannel, deleteChannel,
    addReferral, toggleReferral, deleteReferral
  } = useAdmin();

  const [activeSection, setActiveSection] = useState('analytics');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'analytics': return <AnalyticsDashboard stats={stats} dailyStats={dailyStats} />;
      case 'users': return <UserManagement />;
      case 'payments': return <PaymentManager />;
      case 'achievements': return <AchievementManager />;
      case 'dictations': return <DictationManager />;
      case 'books': return <BookManager />;
      case 'contests': return <ContestManager />;
      case 'leaderboard': return <LeaderboardManager />;
      case 'broadcast': return <BroadcastMessage />;
      case 'scheduled': return <ScheduledMessages />;
      case 'feedback': return <FeedbackSupport />;
      case 'channels': return <ChannelManager channels={channels} addChannel={addChannel} toggleChannel={toggleChannel} deleteChannel={deleteChannel} />;
      case 'referrals': return <ReferralManager referrals={referrals} addReferral={addReferral} toggleReferral={toggleReferral} deleteReferral={deleteReferral} />;
      case 'funnel': return <FunnelAnalytics />;
      case 'setup': return <OnboardingWizard />;
      case 'stats': return <AdvancedStatistics />;
      default: return <AnalyticsDashboard stats={stats} dailyStats={dailyStats} />;
    }
  };

  const currentLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeSection)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Bot va foydalanuvchilar boshqaruvi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-b bg-card/30 py-2 px-4 sticky top-[60px] z-10">
        <AdminNavMobile active={activeSection} onChange={setActiveSection} />
      </div>

      {/* Desktop: sidebar + content */}
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar — desktop only */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="sticky top-[80px]">
              <ScrollArea className="h-[calc(100vh-120px)]">
                <AdminNav active={activeSection} onChange={setActiveSection} />
              </ScrollArea>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Admin;
