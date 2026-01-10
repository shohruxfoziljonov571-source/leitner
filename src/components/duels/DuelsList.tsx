import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWordDuels } from '@/hooks/useWordDuels';
import DuelCard from './DuelCard';
import DuelGame from './DuelGame';
import CreateDuelDialog from './CreateDuelDialog';

const DuelsList: React.FC = () => {
  const {
    pendingDuels,
    activeDuels,
    completedDuels,
    activeDuel,
    isLoading,
    acceptDuel,
    declineDuel,
    startDuel,
    endDuel,
  } = useWordDuels();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Yuklanmoqda...
      </div>
    );
  }

  // Show active game
  if (activeDuel) {
    return (
      <DuelGame
        duel={activeDuel}
        onComplete={endDuel}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-xl flex items-center gap-2">
          <Swords className="w-5 h-5" />
          So'z duellari
        </h2>
        <CreateDuelDialog />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-1">
            <Clock className="w-4 h-4" />
            Kutilmoqda
            {pendingDuels.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {pendingDuels.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1">
            <Swords className="w-4 h-4" />
            Faol
            {activeDuels.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">
                {activeDuels.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <Trophy className="w-4 h-4" />
            Tugatilgan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingDuels.length === 0 ? (
            <EmptyState message="Kutilayotgan duellar yo'q" />
          ) : (
            <div className="space-y-3">
              {pendingDuels.map((duel) => (
                <DuelCard
                  key={duel.id}
                  duel={duel}
                  onAccept={() => acceptDuel(duel.id)}
                  onDecline={() => declineDuel(duel.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeDuels.length === 0 ? (
            <EmptyState message="Faol duellar yo'q" />
          ) : (
            <div className="space-y-3">
              {activeDuels.map((duel) => (
                <DuelCard
                  key={duel.id}
                  duel={duel}
                  onPlay={() => startDuel(duel)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedDuels.length === 0 ? (
            <EmptyState message="Tugatilgan duellar yo'q" />
          ) : (
            <div className="space-y-3">
              {completedDuels.slice(0, 10).map((duel) => (
                <DuelCard key={duel.id} duel={duel} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-12 text-muted-foreground"
  >
    <Swords className="w-12 h-12 mx-auto mb-2 opacity-30" />
    <p>{message}</p>
  </motion.div>
);

export default DuelsList;
