import React, { useState, useEffect } from 'react';
import { Search, Ban, Shield, ShieldCheck, UserX, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  telegram_username: string | null;
  telegram_chat_id: number | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  created_at: string;
}

interface UserStats {
  total_words: number;
  streak: number;
  xp: number;
  level: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, user_id, full_name, telegram_username, telegram_chat_id, is_blocked, blocked_reason, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,telegram_username.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Foydalanuvchilarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const openUserDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);

    // Fetch user stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('total_words, streak, xp, level')
      .eq('user_id', user.user_id)
      .maybeSingle();

    setUserStats(stats as UserStats | null);

    // Fetch user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.user_id)
      .maybeSingle();

    setUserRole(roleData?.role || 'user');
  };

  const handleBlock = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_reason: blockReason || null
        })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast.success('Foydalanuvchi bloklandi');
      setIsBlockOpen(false);
      setBlockReason('');
      fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Bloklashda xatolik');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async (user: UserProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: false,
          blocked_at: null,
          blocked_reason: null
        })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast.success('Blok olib tashlandi');
      fetchUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleSetRole = async (role: 'admin' | 'moderator' | 'user') => {
    if (!selectedUser) return;
    setActionLoading(true);

    try {
      // First remove existing role if any
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.user_id);

      // Insert new role
      if (role !== 'user') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role });

        if (error) throw error;
      }

      toast.success(`Rol o'zgartirildi: ${role}`);
      setUserRole(role);
    } catch (error) {
      console.error('Error setting role:', error);
      toast.error('Rol o\'zgartirishda xatolik');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Foydalanuvchilar boshqaruvi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ism yoki username bo'yicha qidirish..."
              className="pl-10"
            />
          </div>

          {/* Users List */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Foydalanuvchilar topilmadi
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      user.is_blocked ? 'bg-destructive/10 border-destructive/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        user.is_blocked ? 'bg-destructive/20' : 'bg-primary/10'
                      }`}>
                        {user.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || 'Nomsiz'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.telegram_username ? `@${user.telegram_username}` : 'Telegram ulanmagan'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.is_blocked && (
                        <Badge variant="destructive" className="text-xs">Bloklangan</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openUserDetails(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {user.is_blocked ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnblock(user)}
                        >
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsBlockOpen(true);
                          }}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Foydalanuvchi ma'lumotlari</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                  {selectedUser.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.full_name || 'Nomsiz'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.telegram_username ? `@${selectedUser.telegram_username}` : 'Telegram ulanmagan'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ro'yxatdan o'tgan: {formatDate(selectedUser.created_at)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              {userStats && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-lg font-bold">{userStats.total_words}</p>
                    <p className="text-xs text-muted-foreground">So'zlar</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-lg font-bold">{userStats.streak}</p>
                    <p className="text-xs text-muted-foreground">Streak</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-lg font-bold">{userStats.xp || 0}</p>
                    <p className="text-xs text-muted-foreground">XP</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-lg font-bold">{userStats.level || 1}</p>
                    <p className="text-xs text-muted-foreground">Level</p>
                  </div>
                </div>
              )}

              {/* Role Management */}
              <div className="space-y-2">
                <Label>Roli</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={userRole === 'user' ? 'default' : 'outline'}
                    onClick={() => handleSetRole('user')}
                    disabled={actionLoading}
                  >
                    User
                  </Button>
                  <Button
                    size="sm"
                    variant={userRole === 'moderator' ? 'default' : 'outline'}
                    onClick={() => handleSetRole('moderator')}
                    disabled={actionLoading}
                  >
                    Moderator
                  </Button>
                  <Button
                    size="sm"
                    variant={userRole === 'admin' ? 'default' : 'outline'}
                    onClick={() => handleSetRole('admin')}
                    disabled={actionLoading}
                  >
                    Admin
                  </Button>
                </div>
              </div>

              {/* Block Status */}
              {selectedUser.is_blocked && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm font-medium text-destructive">Bloklangan</p>
                  {selectedUser.blocked_reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sabab: {selectedUser.blocked_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Confirmation Dialog */}
      <Dialog open={isBlockOpen} onOpenChange={setIsBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Foydalanuvchini bloklash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{selectedUser?.full_name || 'Bu foydalanuvchi'}</strong>ni bloklashni tasdiqlaysizmi?
            </p>
            <div className="space-y-2">
              <Label>Sabab (ixtiyoriy)</Label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Bloklash sababini kiriting..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bloklash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
