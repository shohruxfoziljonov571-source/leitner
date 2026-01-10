import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Swords, Users } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { useWordDuels } from '@/hooks/useWordDuels';

interface CreateDuelDialogProps {
  trigger?: React.ReactNode;
}

const CreateDuelDialog: React.FC<CreateDuelDialogProps> = ({ trigger }) => {
  const { friends } = useFriends();
  const { createDuel } = useWordDuels();
  const [open, setOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(5);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedFriend) return;

    setIsCreating(true);
    const result = await createDuel(selectedFriend, wordCount);
    setIsCreating(false);

    if (result) {
      setOpen(false);
      setSelectedFriend(null);
    }
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Swords className="w-4 h-4" />
            Duel boshlash
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Yangi duel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Word count selection */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">So'zlar soni:</p>
            <div className="flex gap-2">
              {[5, 10, 15].map((count) => (
                <Button
                  key={count}
                  variant={wordCount === count ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWordCount(count)}
                >
                  {count} so'z
                </Button>
              ))}
            </div>
          </div>

          {/* Friend selection */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Raqibni tanlang:</p>
            {acceptedFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Do'stlaringiz yo'q</p>
                <p className="text-xs">Avval do'st qo'shing</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {acceptedFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend.friendId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selectedFriend === friend.friendId
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                    }`}
                  >
                    <Avatar>
                      <AvatarImage src={friend.avatarUrl || undefined} />
                      <AvatarFallback>{friend.fullName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium">{friend.fullName || "Noma'lum"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={!selectedFriend || isCreating}
            className="w-full gap-2"
          >
            <Swords className="w-4 h-4" />
            {isCreating ? 'Yuborilmoqda...' : 'Duel yuborish'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDuelDialog;
