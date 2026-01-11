import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Friend {
  id: string;
  friendId: string;
  fullName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streak: number;
  totalWords: number;
  status: 'pending' | 'accepted' | 'rejected';
  isRequester: boolean;
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [myFriendCode, setMyFriendCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Batch all queries in parallel
      const [profileResult, friendshipsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('friend_code')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('friendships')
          .select('*')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      ]);

      setMyFriendCode(profileResult.data?.friend_code || null);

      const friendships = friendshipsResult.data || [];
      
      if (friendships.length === 0) {
        setFriends([]);
        setPendingRequests([]);
        setIsLoading(false);
        return;
      }

      // Get all friend user IDs
      const friendUserIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Batch fetch all profiles and stats in parallel
      const [profilesResult, statsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', friendUserIds),
        supabase
          .from('user_stats')
          .select('user_id, xp, level, streak, total_words')
          .in('user_id', friendUserIds)
      ]);

      // Create lookup maps
      const profileMap = new Map(
        (profilesResult.data || []).map(p => [p.user_id, p])
      );
      
      // Aggregate stats by user
      const statsMap = new Map<string, { xp: number; level: number; streak: number; totalWords: number }>();
      for (const stat of statsResult.data || []) {
        const existing = statsMap.get(stat.user_id);
        if (existing) {
          existing.xp += stat.xp || 0;
          existing.level = Math.max(existing.level, stat.level || 1);
          existing.streak = Math.max(existing.streak, stat.streak || 0);
          existing.totalWords += stat.total_words || 0;
        } else {
          statsMap.set(stat.user_id, {
            xp: stat.xp || 0,
            level: stat.level || 1,
            streak: stat.streak || 0,
            totalWords: stat.total_words || 0,
          });
        }
      }

      const friendsList: Friend[] = [];
      const pendingList: Friend[] = [];

      for (const friendship of friendships) {
        const isRequester = friendship.user_id === user.id;
        const friendUserId = isRequester ? friendship.friend_id : friendship.user_id;

        const profile = profileMap.get(friendUserId);
        const stats = statsMap.get(friendUserId) || { xp: 0, level: 1, streak: 0, totalWords: 0 };

        const friend: Friend = {
          id: friendship.id,
          friendId: friendUserId,
          fullName: profile?.full_name || 'Foydalanuvchi',
          avatarUrl: profile?.avatar_url || null,
          xp: stats.xp,
          level: stats.level,
          streak: stats.streak,
          totalWords: stats.totalWords,
          status: friendship.status as 'pending' | 'accepted' | 'rejected',
          isRequester,
        };

        if (friendship.status === 'accepted') {
          friendsList.push(friend);
        } else if (friendship.status === 'pending' && !isRequester) {
          pendingList.push(friend);
        }
      }

      // Sort by XP
      friendsList.sort((a, b) => b.xp - a.xp);
      setFriends(friendsList);
      setPendingRequests(pendingList);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const addFriendByCode = useCallback(async (code: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Find user by friend code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('friend_code', code.toUpperCase())
        .single();

      if (profileError || !profile) {
        toast.error('Do\'st topilmadi');
        return false;
      }

      if (profile.user_id === user.id) {
        toast.error('O\'zingizni qo\'sha olmaysiz');
        return false;
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${profile.user_id}),and(user_id.eq.${profile.user_id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        toast.error('Bu foydalanuvchi allaqachon do\'stlar ro\'yxatida');
        return false;
      }

      // Create friendship request
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: profile.user_id,
          status: 'pending',
        });

      if (error) throw error;

      toast.success(`${profile.full_name || 'Foydalanuvchi'}ga so'rov yuborildi`);
      fetchFriends();
      return true;
    } catch (error) {
      console.error('Error adding friend:', error);
      toast.error('Xatolik yuz berdi');
      return false;
    }
  }, [user, fetchFriends]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Do\'st qo\'shildi!');
      fetchFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Xatolik yuz berdi');
    }
  }, [fetchFriends]);

  const rejectRequest = useCallback(async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'rejected' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('So\'rov rad etildi');
      fetchFriends();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Xatolik yuz berdi');
    }
  }, [fetchFriends]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Do\'st o\'chirildi');
      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Xatolik yuz berdi');
    }
  }, [fetchFriends]);

  return {
    friends,
    pendingRequests,
    myFriendCode,
    isLoading,
    addFriendByCode,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refreshFriends: fetchFriends,
  };
};
