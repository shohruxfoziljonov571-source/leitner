import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Brain, 
  Clock, 
  Target, 
  TrendingUp, 
  Box, 
  ArrowRight,
  CheckCircle,
  Lightbulb,
  Zap,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const About: React.FC = () => {
  const { t } = useLanguage();

  const steps = [
    {
      box: 1,
      interval: "1 soat",
      description: "Yangi so'zlar. Tez-tez takrorlanadi",
      color: "hsl(var(--box-1))"
    },
    {
      box: 2,
      interval: "5 soat",
      description: "Bir marta to'g'ri javob berilgan",
      color: "hsl(var(--box-2))"
    },
    {
      box: 3,
      interval: "1 kun",
      description: "Yaxshi esda qolmoqda",
      color: "hsl(var(--box-3))"
    },
    {
      box: 4,
      interval: "5 kun",
      description: "Mustahkam o'zlashtirilmoqda",
      color: "hsl(var(--box-4))"
    },
    {
      box: 5,
      interval: "30 kun",
      description: "To'liq o'zlashtirilgan!",
      color: "hsl(var(--box-5))"
    }
  ];

  const benefits = [
    {
      icon: Brain,
      title: "Ilmiy asos",
      description: "1970-yillarda nemis psixologi Sebastian Leitner tomonidan ishlab chiqilgan va ilmiy tadqiqotlar bilan tasdiqlangan usul"
    },
    {
      icon: Clock,
      title: "Vaqtni tejash",
      description: "Faqat kerakli so'zlarni takrorlaysiz - bilganlaringizga kam, bilmaganlaringizga ko'p vaqt sarflaysiz"
    },
    {
      icon: Target,
      title: "Maqsadli takrorlash",
      description: "Har bir so'z optimal vaqtda takrorlanadi - unutish ehtimoli eng yuqori bo'lgan paytda"
    },
    {
      icon: TrendingUp,
      title: "Progressiv o'rganish",
      description: "So'zlar qiyinchilik darajasiga qarab avtomatik tartiblangan"
    }
  ];

  const howToUse = [
    {
      step: 1,
      title: "So'z qo'shing",
      description: "Yangi so'z va uning tarjimasini kiriting. Misollar qo'shish yodda saqlashni osonlashtiradi."
    },
    {
      step: 2,
      title: "Kunlik takrorlash",
      description: "Ilova takrorlash vaqti kelgan so'zlarni ko'rsatadi. \"O'rganish\" tugmasini bosing."
    },
    {
      step: 3,
      title: "Javob bering",
      description: "So'zni ko'rib, tarjimasini eslashga harakat qiling. So'ng javobni tekshiring."
    },
    {
      step: 4,
      title: "Baholang",
      description: "To'g'ri esladingizmi? \"Bildim\" yoki \"Bilmadim\" tugmasini bosing."
    },
    {
      step: 5,
      title: "Davom eting",
      description: "Har kuni takrorlang. So'zlar avtomatik ravishda qutilar bo'ylab harakatlanadi."
    }
  ];

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-primary flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-4">
            Leitner Tizimi Nima?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Dunyodagi eng samarali so'z yodlash usullaridan biri - ilmiy asoslangan va 50 yildan ortiq sinab ko'rilgan
          </p>
        </motion.div>

        {/* Video Tutorial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl shadow-card p-6 mb-8"
        >
          <h2 className="font-display font-semibold text-xl mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Video Qo'llanma
          </h2>
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted">
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/h-F2OofEobQ?start=110&end=574"
              title="Leitner tizimi haqida video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3 text-center">
            Leitner tizimi qanday ishlashini video orqali ko'ring
          </p>
        </motion.div>

        {/* Origin Story */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-3xl shadow-card p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-xl mb-3">
                Tarix va Kelib Chiqishi
              </h2>
              <p className="text-muted-foreground mb-4">
                Leitner tizimi 1972-yilda nemis jurnalisti va ilmiy yozuvchi <strong>Sebastian Leitner</strong> tomonidan "So lernt man lernen" ("Shunday o'rganish kerak") kitobida taqdim etilgan.
              </p>
              <p className="text-muted-foreground">
                Bu usul <strong>"intervalli takrorlash"</strong> (spaced repetition) prinspiga asoslangan - ya'ni ma'lumotni unutish ehtimoli eng yuqori bo'lgan paytda takrorlash xotirani mustahkamlaydi.
              </p>
            </div>
          </div>
        </motion.div>

        {/* How it Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-3xl shadow-card p-6 mb-8"
        >
          <h2 className="font-display font-semibold text-xl mb-6 flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" />
            Qanday Ishlaydi?
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Tizimda 5 ta "quti" mavjud. Har bir so'z birinchi qutidan boshlanadi va to'g'ri javoblar bilan yuqori qutilarga ko'tariladi:
          </p>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.box}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: step.color }}
                >
                  {step.box}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Quti {step.box}</span>
                    <span className="text-sm text-primary font-medium">{step.interval}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 hidden md:block" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Agar noto'g'ri javob bersangiz, so'z qaytadan 1-qutiga tushadi va jarayon boshidan boshlanadi.
            </p>
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="font-display font-semibold text-xl mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Nima Uchun Leitner?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                className="bg-card rounded-2xl shadow-card p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How to Use */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-3xl shadow-card p-6 mb-8"
        >
          <h2 className="font-display font-semibold text-xl mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Qanday Foydalanish?
          </h2>
          
          <div className="space-y-4">
            {howToUse.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-6 mb-8"
        >
          <h2 className="font-display font-semibold text-xl mb-4">
            💡 Samarali O'rganish Uchun Maslahatlar
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Har kuni bir xil vaqtda takrorlang - odat hosil qiling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Kuniga 20-30 ta yangi so'z qo'shing - ko'p emas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Misol gaplar qo'shing - kontekst yodda saqlashni osonlashtiradi</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Kategoriyalardan foydalaning - mavzular bo'yicha guruhlang</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>O'zingizga halol bo'ling - bilmasangiz "Bilmadim" bosing</span>
            </li>
          </ul>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-center"
        >
          <Link to="/add">
            <Button size="lg" className="gap-2 gradient-primary text-primary-foreground h-14 text-lg">
              <BookOpen className="w-5 h-5" />
              O'rganishni Boshlash
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
