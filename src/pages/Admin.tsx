import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, TrendingUp, Calendar, 
  Plus, ExternalLink, Trash2, ToggleLeft, ToggleRight,
  Copy, BarChart3, MessageSquare, Link2, Shield, Trophy, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdmin } from '@/hooks/useAdmin';
import ContestManager from '@/components/admin/ContestManager';
import BroadcastMessage from '@/components/admin/BroadcastMessage';
import { toast } from 'sonner';
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

const Admin = () => {
  const { 
    isAdmin, 
    isLoading, 
    stats, 
    channels, 
    referrals, 
    dailyStats,
    addChannel, 
    toggleChannel, 
    deleteChannel,
    addReferral,
    toggleReferral,
    deleteReferral
  } = useAdmin();

  const [newChannel, setNewChannel] = useState({
    channel_id: '',
    channel_name: '',
    channel_username: '',
    channel_url: ''
  });

  const [newReferral, setNewReferral] = useState({
    code: '',
    name: '',
    description: ''
  });

  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false);

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

  const handleAddChannel = async () => {
    if (!newChannel.channel_id || !newChannel.channel_name || !newChannel.channel_username) {
      toast.error('Barcha maydonlarni to\'ldiring');
      return;
    }

    const result = await addChannel(newChannel);
    if (result.success) {
      toast.success('Kanal qo\'shildi');
      setNewChannel({ channel_id: '', channel_name: '', channel_username: '', channel_url: '' });
      setIsChannelDialogOpen(false);
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
    }
  };

  const handleAddReferral = async () => {
    if (!newReferral.code || !newReferral.name) {
      toast.error('Kod va nom kiritilishi shart');
      return;
    }

    const result = await addReferral(newReferral);
    if (result.success) {
      toast.success('Referral qo\'shildi');
      setNewReferral({ code: '', name: '', description: '' });
      setIsReferralDialogOpen(false);
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
    }
  };

  const copyReferralUrl = (code: string) => {
    const url = `https://t.me/leitner_study_bot?start=ref_${code}`;
    navigator.clipboard.writeText(url);
    toast.success('URL nusxalandi');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground">Bot va foydalanuvchilar statistikasi</p>
        </motion.div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analitika</span>
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="flex items-center gap-1 text-xs sm:text-sm">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Xabar</span>
            </TabsTrigger>
            <TabsTrigger value="contests" className="flex items-center gap-1 text-xs sm:text-sm">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Konkurslar</span>
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex items-center gap-1 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Kanallar</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-1 text-xs sm:text-sm">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Referrallar</span>
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                      <p className="text-xs text-muted-foreground">Jami foydalanuvchilar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.activeToday || 0}</p>
                      <p className="text-xs text-muted-foreground">Bugun faol</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalWords || 0}</p>
                      <p className="text-xs text-muted-foreground">Jami so'zlar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Calendar className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.newUsersThisWeek || 0}</p>
                      <p className="text-xs text-muted-foreground">Yangi (7 kun)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <BarChart3 className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.avgWordsPerUser || 0}</p>
                      <p className="text-xs text-muted-foreground">O'rtacha so'z/user</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-500/10">
                      <TrendingUp className="h-5 w-5 text-pink-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalReviews || 0}</p>
                      <p className="text-xs text-muted-foreground">Bugungi takrorlar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kunlik faollik (14 kun)</CardTitle>
              </CardHeader>
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
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover p-3 rounded-lg shadow-lg border">
                                <p className="font-medium">{formatDate(label)}</p>
                                <p className="text-sm text-muted-foreground">
                                  Yangi foydalanuvchilar: {payload[0]?.value}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorUsers)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Takrorlar va yangi so'zlar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover p-3 rounded-lg shadow-lg border">
                                <p className="font-medium">{formatDate(label)}</p>
                                <p className="text-sm text-green-500">
                                  Takrorlar: {payload[0]?.value}
                                </p>
                                <p className="text-sm text-blue-500">
                                  Yangi so'zlar: {payload[1]?.value}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="reviews" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="newWords" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast">
            <BroadcastMessage />
          </TabsContent>

          {/* Contests Tab */}
          <TabsContent value="contests">
            <ContestManager />
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Majburiy kanallar</h2>
              <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Kanal qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yangi kanal qo'shish</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Kanal ID</Label>
                      <Input
                        value={newChannel.channel_id}
                        onChange={(e) => setNewChannel({ ...newChannel, channel_id: e.target.value })}
                        placeholder="-1001234567890"
                      />
                    </div>
                    <div>
                      <Label>Kanal nomi</Label>
                      <Input
                        value={newChannel.channel_name}
                        onChange={(e) => setNewChannel({ ...newChannel, channel_name: e.target.value })}
                        placeholder="Leitner Study"
                      />
                    </div>
                    <div>
                      <Label>Username</Label>
                      <Input
                        value={newChannel.channel_username}
                        onChange={(e) => setNewChannel({ ...newChannel, channel_username: e.target.value })}
                        placeholder="leitner_study"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={newChannel.channel_url}
                        onChange={(e) => setNewChannel({ ...newChannel, channel_url: e.target.value })}
                        placeholder="https://t.me/leitner_study"
                      />
                    </div>
                    <Button onClick={handleAddChannel} className="w-full">
                      Qo'shish
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {channels.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Hali kanallar qo'shilmagan
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {channels.map((channel) => (
                  <Card key={channel.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${channel.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <div>
                            <p className="font-medium">{channel.channel_name}</p>
                            <p className="text-sm text-muted-foreground">@{channel.channel_username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(channel.channel_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleChannel(channel.id, !channel.is_active)}
                          >
                            {channel.is_active ? (
                              <ToggleRight className="h-5 w-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteChannel(channel.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Referral linklar</h2>
              <Dialog open={isReferralDialogOpen} onOpenChange={setIsReferralDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Referral qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yangi referral yaratish</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Kod (URL uchun)</Label>
                      <Input
                        value={newReferral.code}
                        onChange={(e) => setNewReferral({ ...newReferral, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                        placeholder="instagram_jan2026"
                      />
                    </div>
                    <div>
                      <Label>Nomi</Label>
                      <Input
                        value={newReferral.name}
                        onChange={(e) => setNewReferral({ ...newReferral, name: e.target.value })}
                        placeholder="Instagram reklama - Yanvar 2026"
                      />
                    </div>
                    <div>
                      <Label>Izoh (ixtiyoriy)</Label>
                      <Input
                        value={newReferral.description}
                        onChange={(e) => setNewReferral({ ...newReferral, description: e.target.value })}
                        placeholder="@shohruxdigital orqali"
                      />
                    </div>
                    <Button onClick={handleAddReferral} className="w-full">
                      Yaratish
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {referrals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Hali referrallar yaratilmagan
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <Card key={referral.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${referral.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <div>
                            <p className="font-medium">{referral.name}</p>
                            {referral.description && (
                              <p className="text-sm text-muted-foreground">{referral.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyReferralUrl(referral.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleReferral(referral.id, !referral.is_active)}
                          >
                            {referral.is_active ? (
                              <ToggleRight className="h-5 w-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteReferral(referral.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          <span>{referral.clicks} bosish</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-green-500" />
                          <span>{referral.registrations} ro'yxat</span>
                        </div>
                        <div className="text-muted-foreground">
                          Konversiya: {referral.clicks > 0 ? Math.round((referral.registrations / referral.clicks) * 100) : 0}%
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                        https://t.me/leitner_study_bot?start=ref_{referral.code}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
