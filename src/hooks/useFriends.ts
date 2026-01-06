import { useState, useEffect, useCallback } from 'react';
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

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  friend_code: string | null;
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

      // Get my friend code
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('friend_code')
        .eq('user_id', user.id)
        .single();

      setMyFriendCode(myProfile?.friend_code || null);

      // Get all friendships
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      const friendsList: Friend[] = [];
      const pendingList: Friend[] = [];

      for (const friendship of friendships || []) {
        const isRequester = friendship.user_id === user.id;
        const friendUserId = isRequester ? friendship.friend_id : friendship.user_id;

        // Get friend's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('user_id', friendUserId)
          .single();

        // Get friend's stats (sum of all language stats)
        const { data: stats } = await supabase
          .from('user_stats')
          .select('xp, level, streak, total_words')
          .eq('user_id', friendUserId);

        const totalXp = stats?.reduce((sum, s) => sum + (s.xp || 0), 0) || 0;
        const maxLevel = stats?.reduce((max, s) => Math.max(max, s.level || 1), 1) || 1;
        const maxStreak = stats?.reduce((max, s) => Math.max(max, s.streak || 0), 0) || 0;
        const totalWords = stats?.reduce((sum, s) => sum + (s.total_words || 0), 0) || 0;

        const friend: Friend = {
          id: friendship.id,
          friendId: friendUserId,
          fullName: profile?.full_name || 'Foydalanuvchi',
          avatarUrl: profile?.avatar_url,
          xp: totalXp,
          level: maxLevel,
          streak: maxStreak,
          totalWords,
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

  const addFriendByCode = async (code: string): Promise<boolean> => {
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
        .single();

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
  };

  const acceptRequest = async (friendshipId: string) => {
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
  };

  const rejectRequest = async (friendshipId: string) => {
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
  };

  const removeFriend = async (friendshipId: string) => {
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
  };

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
