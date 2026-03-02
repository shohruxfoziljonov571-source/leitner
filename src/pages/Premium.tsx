import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  Upload,
  Loader2,
  Clock,
  Star,
  Zap,
  Brain,
  BookOpen,
  Mic,
  BarChart3,
  Swords,
  FileSpreadsheet,
  Infinity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/contexts/PremiumContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlanOption {
  plan: "monthly" | "quarterly" | "yearly";
  label: string;
  price: string;
  perMonth: string;
  savings?: string;
  popular?: boolean;
}

const plans: PlanOption[] = [
  { plan: "monthly", label: "1 oy", price: "12 000 so'm", perMonth: "12 000 so'm/oy" },
  { plan: "quarterly", label: "3 oy", price: "29 000 so'm", perMonth: "9 667 so'm/oy", savings: "19%", popular: true },
  { plan: "yearly", label: "1 yil", price: "99 000 so'm", perMonth: "8 250 so'm/oy", savings: "31%" },
];

const features = [
  { icon: Infinity, label: "So'z qo'shish", free: "✅ Cheksiz", premium: "✅ Cheksiz" },
  { icon: Zap, label: "Flashcard takrorlash", free: "✅ Cheksiz", premium: "✅ Cheksiz" },
  { icon: Zap, label: "Quiz rejimlar (4 variant, Tezlik, Yozma)", free: "❌", premium: "✅" },
  { icon: Brain, label: "AI Smart Review", free: "❌", premium: "✅" },
  { icon: Mic, label: "Diktant mashqlari", free: "❌", premium: "✅" },
  { icon: BookOpen, label: "Kitoblar", free: "❌", premium: "✅" },
  { icon: Star, label: "Mnemonikalar", free: "❌", premium: "✅" },
  { icon: FileSpreadsheet, label: "Excel import/export", free: "❌", premium: "✅" },
  { icon: BarChart3, label: "Kengaytirilgan statistika", free: "❌", premium: "✅" },
  { icon: Swords, label: "So'z duellari", free: "❌", premium: "✅" },
];

const PAYMENT_DETAILS = {
  card: "9860 3501 4530 3078",
  holder: "Shohruxbek Foziljonov",
  bank: "Humo",
};

const Premium: React.FC = () => {
  const { user } = useAuth();
  const { isPremium, subscription, hasPendingPayment, daysUntilExpiry, refetch } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(plans[1]);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [step, setStep] = useState<"plans" | "payment" | "upload" | "done">("plans");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Fayl hajmi 5MB dan oshmasligi kerak");
        return;
      }
      setReceiptFile(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!user || !receiptFile) return;
    setUploading(true);

    try {
      // Upload receipt
      const fileExt = receiptFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(filePath);

      // Create payment record
      const amount = selectedPlan.plan === "monthly" ? 12000 : selectedPlan.plan === "quarterly" ? 29000 : 99000;

      const { data: paymentData, error: paymentError } = await supabase.from("premium_payments").insert({
        user_id: user.id,
        plan: selectedPlan.plan,
        amount,
        currency: "UZS",
        receipt_url: filePath,
        status: "pending",
      }).select("id").single();

      if (paymentError) throw paymentError;

      // Notify admin via Telegram bot
      try {
        await supabase.functions.invoke("notify-payment", {
          body: { payment_id: paymentData.id },
        });
      } catch (e) {
        console.error("Notify error:", e);
      }

      setStep("done");
      await refetch();
      toast.success("To'lov yuborildi! Admin tez orada tekshiradi.");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setUploading(false);
    }
  };

  // Already premium
  if (isPremium) {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
              <Crown className="w-10 h-10 text-accent" />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2">Siz Premium foydalanuvchisiz! 👑</h1>
            <p className="text-muted-foreground mb-4">
              Rejangiz:{" "}
              <Badge variant="secondary" className="ml-1">
                {subscription?.plan}
              </Badge>
            </p>
            {daysUntilExpiry !== null && (
              <p className="text-sm text-muted-foreground">
                Obuna tugashiga <strong>{daysUntilExpiry}</strong> kun qoldi
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Pending payment
  if (hasPendingPayment || step === "done") {
    return (
      <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
              <Clock className="w-10 h-10 text-accent" />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2">To'lov tekshirilmoqda ⏳</h1>
            <p className="text-muted-foreground mb-2">Sizning to'lovingiz admin tomonidan tekshirilmoqda.</p>
            <p className="text-sm text-muted-foreground">Odatda 1-24 soat ichida tasdiqlanadi.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pt-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
            <Crown className="w-8 h-8 text-accent" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">Premium olish</h1>
          <p className="text-muted-foreground text-sm">Barcha funksiyalardan cheksiz foydalaning</p>
        </motion.div>

        {step === "plans" && (
          <>
            {/* Plans */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3 mb-8"
            >
              {plans.map((plan) => (
                <button
                  key={plan.plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all relative ${
                    selectedPlan.plan === plan.plan
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 right-4 bg-accent text-accent-foreground text-[10px]">
                      Ommabop
                    </Badge>
                  )}
                  {plan.savings && (
                    <Badge variant="secondary" className="absolute -top-2.5 left-4 text-[10px]">
                      {plan.savings} tejash
                    </Badge>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{plan.label}</p>
                      <p className="text-xs text-muted-foreground">{plan.perMonth}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-xl text-foreground">{plan.price}</p>
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>

            {/* Feature comparison */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h3 className="font-display font-semibold text-sm mb-3 text-center">Nima kiradi?</h3>
              <Card>
                <CardContent className="p-0">
                  <div className="grid grid-cols-[1fr_60px_60px] text-xs font-medium text-muted-foreground border-b p-3">
                    <span>Funksiya</span>
                    <span className="text-center">Free</span>
                    <span className="text-center text-accent">Pro</span>
                  </div>
                  {features.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_60px_60px] text-xs items-center p-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-foreground">{f.label}</span>
                        </div>
                        <span className="text-center text-muted-foreground">{f.free}</span>
                        <span className="text-center font-medium">{f.premium}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            <Button
              size="lg"
              className="w-full gradient-primary text-primary-foreground h-12 text-base rounded-xl"
              onClick={() => setStep("payment")}
            >
              <Crown className="w-5 h-5 mr-2" />
              {selectedPlan.price} — Premium olish
            </Button>
          </>
        )}

        {step === "payment" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-display font-semibold">To'lov ma'lumotlari</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reja</span>
                    <span className="font-medium">
                      {selectedPlan.label} — {selectedPlan.price}
                    </span>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-sm font-medium">Karta rekvizitlari:</p>
                    <div className="bg-muted rounded-xl p-4 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Karta</span>
                        <span className="font-mono font-medium text-foreground">{PAYMENT_DETAILS.card}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Egasi</span>
                        <span className="font-medium text-foreground">{PAYMENT_DETAILS.holder}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bank</span>
                        <span className="text-foreground">{PAYMENT_DETAILS.bank}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">⚠️ To'lovni amalga oshirgandan keyin chekni yuklang</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("plans")}>
                Orqaga
              </Button>
              <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => setStep("upload")}>
                To'lov qildim
              </Button>
            </div>
          </motion.div>
        )}

        {step === "upload" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-display font-semibold">Chek yuklash</h3>
                <p className="text-sm text-muted-foreground">To'lov chekining rasmini yoki skrinshtotini yuklang</p>

                <label className="block">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      receiptFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {receiptFile ? (
                      <div>
                        <Check className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-medium text-foreground">{receiptFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{(receiptFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Rasm yoki PDF tanlang</p>
                        <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("payment")}>
                Orqaga
              </Button>
              <Button
                className="flex-1 gradient-primary text-primary-foreground"
                onClick={handleSubmitPayment}
                disabled={!receiptFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Yuborish
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Premium;
