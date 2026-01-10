import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Copy, 
  Check, 
  Trophy, 
  Flame, 
  BookOpen,
  Star,
  X,
  UserCheck,
  UserX,
  Globe,
  Crown,
  Medal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFriends } from '@/hooks/useFriends';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { toast } from 'sonner';

const Friends: React.FC = () => {
  const {
    friends,
    pendingRequests,
    myFriendCode,
    isLoading: friendsLoading,
    addFriendByCode,
    acceptRequest,
    rejectRequest,
    removeFriend,
  } = useFriends();

  const {
    globalLeaderboard,
    isLoading: leaderboardLoading,
    myRank,
    getTopUsers,
  } = useLeaderboard();

  const [friendCode, setFriendCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const copyFriendCode = () => {
    if (myFriendCode) {
      navigator.clipboard.writeText(myFriendCode);
      setCopied(true);
      toast.success('Kod nusxalandi!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddFriend = async () => {
    if (!friendCode.trim()) return;
    setIsAdding(true);
    const success = await addFriendByCode(friendCode.trim());
    if (success) {
      setFriendCode('');
    }
    setIsAdding(false);
  };

  const isLoading = friendsLoading || leaderboardLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return null;
  };

  const getRankStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return 'bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 ring-2 ring-primary/20';
    }
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-400/5 border border-gray-400/30';
    if (rank === 3) return 'bg-gradient-to-r from-amber-700/20 to-amber-700/5 border border-amber-700/30';
    return 'bg-muted/50';
  };

  const LeaderboardItem = ({ 
    entry, 
    showRemove = false, 
    onRemove 
  }: { 
    entry: any; 
    showRemove?: boolean; 
    onRemove?: () => void;
  }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl ${getRankStyle(entry.rank, entry.isCurrentUser)}`}
    >
      {/* Rank */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        entry.rank === 1
          ? 'bg-yellow-500 text-yellow-950'
          : entry.rank === 2
          ? 'bg-gray-400 text-gray-950'
          : entry.rank === 3
          ? 'bg-amber-700 text-white'
          : 'bg-muted text-muted-foreground'
      }`}>
        {getRankIcon(entry.rank) || entry.rank}
      </div>

      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarImage src={entry.avatarUrl || undefined} />
        <AvatarFallback>
          {(entry.fullName || 'U').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate flex items-center gap-1">
          {entry.fullName || 'Foydalanuvchi'}
          {entry.isCurrentUser && (
            <Badge variant="secondary" className="text-xs ml-1">Siz</Badge>
          )}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-primary" />
            Lvl {entry.level}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" />
            {entry.streak}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {entry.totalWords}
          </span>
        </div>
      </div>

      {/* XP */}
      <div className="text-right">
        <p className="font-bold text-primary">{entry.xp.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">XP</p>
      </div>

      {/* Remove button */}
      {showRemove && onRemove && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen pb-24 pt-4 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Do'stlar va Reyting
          </h1>
          <p className="text-muted-foreground mt-1">
            {myRank && `Sizning o'rningiz: #${myRank}`}
          </p>
        </div>

        {/* My Friend Code */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Mening kodim:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-background rounded-lg px-4 py-3 font-mono text-xl tracking-widest text-center">
                {myFriendCode || '--------'}
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={copyFriendCode}
                className="h-12 w-12"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Bu kodni do'stlaringizga yuboring
            </p>
          </CardContent>
        </Card>

        {/* Add Friend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Do'st qo'shish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Do'st kodini kiriting"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                className="font-mono tracking-wider"
                maxLength={8}
              />
              <Button 
                onClick={handleAddFriend} 
                disabled={isAdding || !friendCode.trim()}
              >
                {isAdding ? 'Yuborilmoqda...' : 'Qo\'shish'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <AnimatePresence>
          {pendingRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-500/20">
                      {pendingRequests.length}
                    </Badge>
                    Kutilayotgan so'rovlar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.avatarUrl || undefined} />
                        <AvatarFallback>
                          {request.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{request.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          Do'st bo'lishni xohlaydi
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 text-green-500 hover:bg-green-500/10"
                          onClick={() => acceptRequest(request.id)}
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 text-red-500 hover:bg-red-500/10"
                          onClick={() => rejectRequest(request.id)}
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Umumiy
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Do'stlar
            </TabsTrigger>
          </TabsList>

          {/* Global Leaderboard */}
          <TabsContent value="global">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top 50 - Global Reyting
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getTopUsers(50).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Hali foydalanuvchilar yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getTopUsers(50).map((entry, index) => (
                      <LeaderboardItem 
                        key={entry.userId} 
                        entry={{ ...entry, rank: index + 1 }} 
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Friends Leaderboard */}
          <TabsContent value="friends">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Do'stlar Reytingi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Hali do'stlar yo'q</p>
                    <p className="text-sm mt-1">
                      Kodingizni do'stlaringizga yuboring yoki ularning kodini kiriting
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend, index) => (
                      <LeaderboardItem
                        key={friend.id}
                        entry={{
                          ...friend,
                          rank: index + 1,
                          isCurrentUser: false,
                        }}
                        showRemove
                        onRemove={() => removeFriend(friend.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Friends;
