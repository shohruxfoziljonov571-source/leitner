import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Check, Loader2, BookOpen, Briefcase, Plane, ShoppingCart, Heart, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WordPack {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  words: Array<{ original: string; translated: string }>;
}

const WORD_PACKS_EN: WordPack[] = [
  {
    id: 'basic',
    name: 'Asosiy so\'zlar',
    icon: BookOpen,
    description: '20 ta eng ko\'p ishlatiladigan so\'zlar',
    words: [
      { original: 'hello', translated: 'salom' },
      { original: 'goodbye', translated: 'xayr' },
      { original: 'thank you', translated: 'rahmat' },
      { original: 'please', translated: 'iltimos' },
      { original: 'yes', translated: 'ha' },
      { original: 'no', translated: 'yo\'q' },
      { original: 'sorry', translated: 'kechirasiz' },
      { original: 'excuse me', translated: 'uzr' },
      { original: 'help', translated: 'yordam' },
      { original: 'how are you', translated: 'qalaysiz' },
      { original: 'good', translated: 'yaxshi' },
      { original: 'bad', translated: 'yomon' },
      { original: 'big', translated: 'katta' },
      { original: 'small', translated: 'kichik' },
      { original: 'new', translated: 'yangi' },
      { original: 'old', translated: 'eski' },
      { original: 'beautiful', translated: 'chiroyli' },
      { original: 'happy', translated: 'baxtli' },
      { original: 'sad', translated: 'g\'amgin' },
      { original: 'important', translated: 'muhim' },
    ],
  },
  {
    id: 'travel',
    name: 'Sayohat',
    icon: Plane,
    description: 'Sayohat uchun zarur so\'zlar',
    words: [
      { original: 'airport', translated: 'aeroport' },
      { original: 'hotel', translated: 'mehmonxona' },
      { original: 'ticket', translated: 'chipta' },
      { original: 'passport', translated: 'pasport' },
      { original: 'luggage', translated: 'yuk' },
      { original: 'taxi', translated: 'taksi' },
      { original: 'map', translated: 'xarita' },
      { original: 'restaurant', translated: 'restoran' },
      { original: 'bus', translated: 'avtobus' },
      { original: 'train', translated: 'poyezd' },
      { original: 'museum', translated: 'muzey' },
      { original: 'beach', translated: 'plyaj' },
      { original: 'mountain', translated: 'tog\'' },
      { original: 'city', translated: 'shahar' },
      { original: 'country', translated: 'mamlakat' },
      { original: 'bridge', translated: 'ko\'prik' },
      { original: 'street', translated: 'ko\'cha' },
      { original: 'park', translated: 'bog\'' },
      { original: 'lake', translated: 'ko\'l' },
      { original: 'river', translated: 'daryo' },
    ],
  },
  {
    id: 'work',
    name: 'Ish va biznes',
    icon: Briefcase,
    description: 'Ish joyi uchun so\'zlar',
    words: [
      { original: 'meeting', translated: 'yig\'ilish' },
      { original: 'office', translated: 'ofis' },
      { original: 'manager', translated: 'menejer' },
      { original: 'project', translated: 'loyiha' },
      { original: 'deadline', translated: 'muddat' },
      { original: 'salary', translated: 'maosh' },
      { original: 'interview', translated: 'suhbat' },
      { original: 'experience', translated: 'tajriba' },
      { original: 'colleague', translated: 'hamkasb' },
      { original: 'company', translated: 'kompaniya' },
      { original: 'contract', translated: 'shartnoma' },
      { original: 'schedule', translated: 'jadval' },
      { original: 'report', translated: 'hisobot' },
      { original: 'client', translated: 'mijoz' },
      { original: 'task', translated: 'vazifa' },
      { original: 'team', translated: 'jamoa' },
      { original: 'goal', translated: 'maqsad' },
      { original: 'budget', translated: 'byudjet' },
      { original: 'profit', translated: 'foyda' },
      { original: 'success', translated: 'muvaffaqiyat' },
    ],
  },
  {
    id: 'food',
    name: 'Ovqat va ichimlik',
    icon: Utensils,
    description: 'Oshxona va restoran uchun',
    words: [
      { original: 'bread', translated: 'non' },
      { original: 'meat', translated: 'go\'sht' },
      { original: 'rice', translated: 'guruch' },
      { original: 'fruit', translated: 'meva' },
      { original: 'vegetable', translated: 'sabzavot' },
      { original: 'milk', translated: 'sut' },
      { original: 'egg', translated: 'tuxum' },
      { original: 'cheese', translated: 'pishloq' },
      { original: 'sugar', translated: 'shakar' },
      { original: 'salt', translated: 'tuz' },
      { original: 'tea', translated: 'choy' },
      { original: 'coffee', translated: 'qahva' },
      { original: 'juice', translated: 'sharbat' },
      { original: 'chicken', translated: 'tovuq' },
      { original: 'fish', translated: 'baliq' },
      { original: 'soup', translated: 'sho\'rva' },
      { original: 'salad', translated: 'salat' },
      { original: 'butter', translated: 'sariyog\'' },
      { original: 'potato', translated: 'kartoshka' },
      { original: 'tomato', translated: 'pomidor' },
    ],
  },
  {
    id: 'shopping',
    name: 'Xarid qilish',
    icon: ShoppingCart,
    description: 'Do\'konda ishlatiladigan so\'zlar',
    words: [
      { original: 'price', translated: 'narx' },
      { original: 'discount', translated: 'chegirma' },
      { original: 'size', translated: 'o\'lcham' },
      { original: 'color', translated: 'rang' },
      { original: 'receipt', translated: 'chek' },
      { original: 'cash', translated: 'naqd pul' },
      { original: 'card', translated: 'karta' },
      { original: 'expensive', translated: 'qimmat' },
      { original: 'cheap', translated: 'arzon' },
      { original: 'bag', translated: 'sumka' },
      { original: 'clothes', translated: 'kiyim' },
      { original: 'shoes', translated: 'poyabzal' },
      { original: 'market', translated: 'bozor' },
      { original: 'shop', translated: 'do\'kon' },
      { original: 'try on', translated: 'kiyib ko\'rish' },
      { original: 'buy', translated: 'sotib olish' },
      { original: 'sell', translated: 'sotish' },
      { original: 'change', translated: 'almashish' },
      { original: 'pay', translated: 'to\'lash' },
      { original: 'delivery', translated: 'yetkazib berish' },
    ],
  },
  {
    id: 'health',
    name: 'Sog\'liq',
    icon: Heart,
    description: 'Tibbiy va sog\'liq so\'zlari',
    words: [
      { original: 'doctor', translated: 'shifokor' },
      { original: 'hospital', translated: 'kasalxona' },
      { original: 'medicine', translated: 'dori' },
      { original: 'pain', translated: 'og\'riq' },
      { original: 'headache', translated: 'bosh og\'rig\'i' },
      { original: 'fever', translated: 'isitma' },
      { original: 'cold', translated: 'shamollash' },
      { original: 'cough', translated: 'yo\'tal' },
      { original: 'healthy', translated: 'sog\'lom' },
      { original: 'sick', translated: 'kasal' },
      { original: 'pharmacy', translated: 'dorixona' },
      { original: 'exercise', translated: 'mashq' },
      { original: 'sleep', translated: 'uyqu' },
      { original: 'tired', translated: 'charchagan' },
      { original: 'strong', translated: 'kuchli' },
      { original: 'weak', translated: 'kuchsiz' },
      { original: 'heart', translated: 'yurak' },
      { original: 'blood', translated: 'qon' },
      { original: 'allergy', translated: 'allergiya' },
      { original: 'appointment', translated: 'qabul' },
    ],
  },
];

interface WordPackSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onImport: (words: { originalWord: string; translatedWord: string; exampleSentences: string[] }[]) => Promise<void>;
}

const WordPackSelector: React.FC<WordPackSelectorProps> = ({ sourceLanguage, targetLanguage, onImport }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [addedPacks, setAddedPacks] = useState<Set<string>>(new Set());

  // For now we only have uz→en packs, show them regardless
  const packs = WORD_PACKS_EN;

  const handleAddPack = async (pack: WordPack) => {
    if (addedPacks.has(pack.id)) return;
    setLoading(pack.id);

    try {
      await onImport(
        pack.words.map((w) => ({
          originalWord: w.original,
          translatedWord: w.translated,
          exampleSentences: [],
        }))
      );
      setAddedPacks((prev) => new Set(prev).add(pack.id));
      toast.success(`"${pack.name}" — ${pack.words.length} ta so'z qo'shildi!`);
    } catch (e) {
      // error already handled by parent
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <Package className="w-8 h-8 text-primary mx-auto mb-2" />
        <h3 className="font-semibold text-foreground">Tayyor so'z to'plamlari</h3>
        <p className="text-xs text-muted-foreground">Bir bosishda 20 ta so'z qo'shing</p>
      </div>

      <div className="grid gap-3">
        {packs.map((pack, i) => {
          const isAdded = addedPacks.has(pack.id);
          const isLoading = loading === pack.id;
          const Icon = pack.icon;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card border rounded-xl p-4 flex items-center gap-3 ${
                isAdded ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isAdded ? 'bg-primary/20' : 'bg-muted'
              }`}>
                <Icon className={`w-5 h-5 ${isAdded ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{pack.name}</p>
                <p className="text-xs text-muted-foreground">{pack.description}</p>
              </div>

              <Button
                size="sm"
                variant={isAdded ? 'outline' : 'default'}
                disabled={isAdded || isLoading}
                onClick={() => handleAddPack(pack)}
                className="shrink-0 gap-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    Qo'shildi
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Qo'shish
                  </>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default WordPackSelector;
