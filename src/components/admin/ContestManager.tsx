import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Plus, Calendar, Users, TrendingUp, 
  ToggleLeft, ToggleRight, Trash2, Eye, Gift,
  Clock, Copy
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useContests, Contest, ContestParticipant } from '@/hooks/useContests';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';
import ContestImageUpload from './ContestImageUpload';

const ContestManager = () => {
  const {
    contests,
    participants,
    fetchParticipants,
    createContest,
    toggleContest,
    deleteContest,
    getContestStats
  } = useContests();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [contestStats, setContestStats] = useState<Record<string, any>>({});

  const [newContest, setNewContest] = useState({
    title: '',
    description: '',
    image_url: '',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    contest_type: 'referral',
    winner_count: 3,
    prizes: [
      { place: 1, prize: '100,000 so\'m' },
      { place: 2, prize: '50,000 so\'m' },
      { place: 3, prize: '25,000 so\'m' }
    ],
    min_referrals: 1,
    is_active: true
  });

  // Fetch stats for all contests
  useEffect(() => {
    const loadStats = async () => {
      const stats: Record<string, any> = {};
      for (const contest of contests) {
        stats[contest.id] = await getContestStats(contest.id);
      }
      setContestStats(stats);
    };
    if (contests.length > 0) loadStats();
  }, [contests, getContestStats]);

  const handleCreateContest = async () => {
    if (!newContest.title || !newContest.end_date) {
      toast.error('Sarlavha va tugash sanasini kiriting');
      return;
    }

    const result = await createContest({
      ...newContest,
      start_date: new Date(newContest.start_date).toISOString(),
      end_date: new Date(newContest.end_date).toISOString()
    });

    if (result.success) {
      toast.success('Konkurs yaratildi!');
      setIsDialogOpen(false);
      setNewContest({
        title: '',
        description: '',
        image_url: '',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        contest_type: 'referral',
        winner_count: 3,
        prizes: [
          { place: 1, prize: '100,000 so\'m' },
          { place: 2, prize: '50,000 so\'m' },
          { place: 3, prize: '25,000 so\'m' }
        ],
        min_referrals: 1,
        is_active: true
      });
    } else {
      toast.error(result.error || 'Xatolik yuz berdi');
    }
  };

  const handleViewContest = async (contest: Contest) => {
    setSelectedContest(contest);
    await fetchParticipants(contest.id);
  };

  const getContestStatus = (contest: Contest) => {
    const now = new Date();
    const start = new Date(contest.start_date);
    const end = new Date(contest.end_date);

    if (!contest.is_active) return { label: 'O\'chirilgan', color: 'bg-gray-500' };
    if (now < start) return { label: 'Kutilmoqda', color: 'bg-yellow-500' };
    if (now > end) return { label: 'Tugagan', color: 'bg-red-500' };
    return { label: 'Faol', color: 'bg-green-500' };
  };

  const copyBotLink = (contestId: string) => {
    const link = `https://t.me/Leitner_robot?start=contest_${contestId.slice(0, 8)}`;
    navigator.clipboard.writeText(link);
    toast.success('Link nusxalandi!');
  };

  const updatePrize = (index: number, prize: string) => {
    const newPrizes = [...newContest.prizes];
    newPrizes[index] = { ...newPrizes[index], prize };
    setNewContest({ ...newContest, prizes: newPrizes });
  };

  const addPrize = () => {
    const nextPlace = newContest.prizes.length + 1;
    setNewContest({
      ...newContest,
      prizes: [...newContest.prizes, { place: nextPlace, prize: '' }],
      winner_count: nextPlace
    });
  };

  const removePrize = (index: number) => {
    if (newContest.prizes.length <= 1) return;
    const newPrizes = newContest.prizes.filter((_, i) => i !== index).map((p, i) => ({ ...p, place: i + 1 }));
    setNewContest({
      ...newContest,
      prizes: newPrizes,
      winner_count: newPrizes.length
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Konkurslar
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Konkurs yaratish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yangi konkurs yaratish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Sarlavha *</Label>
                <Input
                  value={newContest.title}
                  onChange={(e) => setNewContest({ ...newContest, title: e.target.value })}
                  placeholder="Referral Konkurs - Fevral 2026"
                />
              </div>

              <div>
                <Label>Tavsif</Label>
                <Textarea
                  value={newContest.description}
                  onChange={(e) => setNewContest({ ...newContest, description: e.target.value })}
                  placeholder="Eng ko'p do'st taklif qilgan g'oliblar sovg'a oladi!"
                  rows={3}
                />
              </div>

              <div>
                <Label>Konkurs rasmi</Label>
                <ContestImageUpload
                  value={newContest.image_url}
                  onChange={(url) => setNewContest({ ...newContest, image_url: url })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Boshlanish sanasi</Label>
                  <Input
                    type="datetime-local"
                    value={newContest.start_date}
                    onChange={(e) => setNewContest({ ...newContest, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tugash sanasi *</Label>
                  <Input
                    type="datetime-local"
                    value={newContest.end_date}
                    onChange={(e) => setNewContest({ ...newContest, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Konkurs turi</Label>
                  <Select
                    value={newContest.contest_type}
                    onValueChange={(v) => setNewContest({ ...newContest, contest_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral (eng ko'p taklif)</SelectItem>
                      <SelectItem value="xp">XP (eng ko'p ball)</SelectItem>
                      <SelectItem value="words">So'zlar (eng ko'p so'z)</SelectItem>
                      <SelectItem value="streak">Streak (eng uzun streak)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min. referral</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newContest.min_referrals}
                    onChange={(e) => setNewContest({ ...newContest, min_referrals: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Sovg'alar
                </Label>
                <div className="space-y-2 mt-2">
                  {newContest.prizes.map((prize, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="w-10 justify-center">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                      </Badge>
                      <Input
                        value={prize.prize}
                        onChange={(e) => updatePrize(index, e.target.value)}
                        placeholder={`${index + 1}-o'rin uchun sovg'a`}
                        className="flex-1"
                      />
                      {newContest.prizes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePrize(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addPrize} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Sovg'a qo'shish
                  </Button>
                </div>
              </div>

              <Button onClick={handleCreateContest} className="w-full">
                Konkurs yaratish
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contests List */}
      {contests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Hali konkurslar yaratilmagan
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contests.map((contest) => {
            const status = getContestStatus(contest);
            const stats = contestStats[contest.id] || {};

            return (
              <motion.div
                key={contest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        {contest.image_url ? (
                          <img
                            src={contest.image_url}
                            alt={contest.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Trophy className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{contest.title}</h3>
                            <div className={`w-2 h-2 rounded-full ${status.color}`} />
                            <span className="text-xs text-muted-foreground">{status.label}</span>
                          </div>
                          {contest.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {contest.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(contest.end_date), 'd MMM yyyy', { locale: uz })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(contest.end_date), { addSuffix: true, locale: uz })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyBotLink(contest.id)}
                          title="Bot linkini nusxalash"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewContest(contest)}
                          title="Batafsil ko'rish"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleContest(contest.id, !contest.is_active)}
                        >
                          {contest.is_active ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteContest(contest.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <Users className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                        <p className="text-lg font-bold">{stats.totalParticipants || 0}</p>
                        <p className="text-xs text-muted-foreground">Ishtirokchi</p>
                      </div>
                      <div className="text-center">
                        <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
                        <p className="text-lg font-bold">{stats.totalReferrals || 0}</p>
                        <p className="text-xs text-muted-foreground">Jami taklif</p>
                      </div>
                      <div className="text-center">
                        <Trophy className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                        <p className="text-lg font-bold">{stats.validReferrals || 0}</p>
                        <p className="text-xs text-muted-foreground">Valid</p>
                      </div>
                      <div className="text-center">
                        <TrendingUp className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                        <p className="text-lg font-bold">{stats.conversionRate || 0}%</p>
                        <p className="text-xs text-muted-foreground">Konversiya</p>
                      </div>
                    </div>

                    {/* Prizes */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {contest.prizes.map((prize, i) => (
                        <Badge key={i} variant="secondary">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {prize.prize}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Participants Dialog */}
      <Dialog open={!!selectedContest} onOpenChange={() => setSelectedContest(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {selectedContest?.title} - Ishtirokchilar
            </DialogTitle>
          </DialogHeader>
          
          {participants.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Hali ishtirokchilar yo'q
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-8 text-center">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                    </span>
                    <div>
                      <p className="font-medium">{participant.full_name}</p>
                      {participant.telegram_username && (
                        <p className="text-xs text-muted-foreground">@{participant.telegram_username}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{participant.referral_count}</p>
                    <p className="text-xs text-muted-foreground">taklif</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContestManager;
