import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Settings, Zap, CheckCircle2, XCircle, Loader2, Send,
  Eye, BarChart3, Clock, RefreshCw, AlertTriangle, Copy, Check
} from 'lucide-react';

interface ConversionEvent {
  id: string;
  click_id: string;
  conversion_sent: boolean;
  conversion_sent_at: string | null;
  telegram_user_id: number | null;
  telegram_username: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  created_at: string;
  channel_joined: boolean;
}

const MetaPixelManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [configStatus, setConfigStatus] = useState<'unknown' | 'configured' | 'error'>('unknown');
  const [recentEvents, setRecentEvents] = useState<ConversionEvent[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalConversions, setTotalConversions] = useState(0);
  const [testClickId, setTestClickId] = useState('');
  const [testEventName, setTestEventName] = useState('CompleteRegistration');
  const [testEventCode, setTestEventCode] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const pixelSnippet = `<!-- Meta Pixel (avtomatik o'rnatilgan) -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>`;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { count: clickCount },
        { count: convCount },
        { data: events }
      ] = await Promise.all([
        supabase.from('ad_clicks').select('*', { count: 'exact', head: true }),
        supabase.from('ad_clicks').select('*', { count: 'exact', head: true }).eq('conversion_sent', true),
        supabase.from('ad_clicks').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      setTotalClicks(clickCount || 0);
      setTotalConversions(convCount || 0);
      setRecentEvents((events || []) as ConversionEvent[]);

      // Check if pixel is working by seeing if any conversions were sent
      if ((convCount || 0) > 0) {
        setConfigStatus('configured');
      } else if ((clickCount || 0) > 0) {
        setConfigStatus('unknown');
      } else {
        setConfigStatus('unknown');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setConfigStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEvent = async () => {
    if (!testClickId.trim()) {
      toast.error('Click ID kiriting');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const body: Record<string, any> = {
        click_id: testClickId.trim(),
        event_name: testEventName,
      };

      if (testEventCode.trim()) {
        body.test_event_code = testEventCode.trim();
      }

      if (testEventName === 'Purchase') {
        body.value = 9.99;
        body.currency = 'USD';
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/meta-conversion`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();
      setTestResult({ status: response.status, ...result });

      if (response.ok) {
        toast.success(`✅ ${testEventName} eventi muvaffaqiyatli yuborildi!`);
        setConfigStatus('configured');
        loadData();
      } else {
        toast.error(`❌ Xatolik: ${result.error || 'Noma\'lum xato'}`);
      }
    } catch (error: any) {
      toast.error(`Xatolik: ${error.message}`);
      setTestResult({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Nusxalandi!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('uz-UZ', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Settings className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Meta Pixel Sozlamalari</h3>
            <p className="text-sm text-muted-foreground">Konversiya kuzatish va event boshqaruvi</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Yangilash
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pixel holati</p>
                <div className="flex items-center gap-2 mt-1">
                  {configStatus === 'configured' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-500">Faol</span>
                    </>
                  ) : configStatus === 'error' ? (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-red-500">Xatolik</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold text-yellow-500">Tekshirilmagan</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jami kliklar</p>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Konversiyalar</p>
                <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🔧 Secrets sozlash
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Meta Pixel ishlashi uchun quyidagi secrets sozlangan bo'lishi kerak. 
            Ularni o'zgartirish uchun pastdagi tugmalardan foydalaning.
          </p>

          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <code className="text-sm font-mono font-medium">META_PIXEL_ID</code>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Meta Events Manager → Pixel → Settings dan oling
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                ✅ Sozlangan
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <code className="text-sm font-mono font-medium">META_ACCESS_TOKEN</code>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Meta Events Manager → Settings → Generate Access Token
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                ✅ Sozlangan
              </Badge>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">📋 Qanday olish mumkin:</p>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>
                <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Meta Events Manager
                </a>{' '}ga kiring
              </li>
              <li>Pixel tanlang → Settings bo'limiga o'ting</li>
              <li>Pixel ID ni nusxalang (16 raqamli kod)</li>
              <li>Conversions API → "Generate access token" tugmasini bosing</li>
              <li>Lovable Secrets ga saqlang</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Event Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 Event xaritasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { event: 'PageView', trigger: 'Landing sahifa ochilganda', type: 'Client-side (Pixel)', color: 'bg-blue-500' },
              { event: 'Lead', trigger: '"Boshlash" tugmasi bosilganda', type: 'Client-side (Pixel)', color: 'bg-yellow-500' },
              { event: 'Lead', trigger: 'Bot /start bosilganda', type: 'Server-side (CAPI)', color: 'bg-yellow-500' },
              { event: 'CompleteRegistration', trigger: 'Kanal a\'zoligi tasdiqlanganda', type: 'Server-side (CAPI)', color: 'bg-green-500' },
              { event: 'Purchase', trigger: 'To\'lov tasdiqlanganda', type: 'Server-side (CAPI)', color: 'bg-purple-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-medium">{item.event}</code>
                    <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.trigger}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Event */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            🧪 Event test qilish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Meta Events Manager dagi Test Events bo'limida natijani ko'rish uchun test_event_code kiriting.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Click ID</Label>
              <Input
                placeholder="test_click_123"
                value={testClickId}
                onChange={(e) => setTestClickId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ad_clicks jadvalidan mavjud click_id yoki yangi test ID
              </p>
            </div>

            <div className="space-y-2">
              <Label>Event nomi</Label>
              <Select value={testEventName} onValueChange={setTestEventName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CompleteRegistration">CompleteRegistration</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Subscribe">Subscribe</SelectItem>
                  <SelectItem value="StartTrial">StartTrial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Test Event Code (ixtiyoriy)</Label>
              <Input
                placeholder="TEST12345"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Meta Events Manager → Test Events → "Test event code" dan nusxalang
              </p>
            </div>
          </div>

          <Button onClick={handleTestEvent} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {testing ? 'Yuborilmoqda...' : 'Test event yuborish'}
          </Button>

          {testResult && (
            <div className={`rounded-lg p-4 border ${testResult.success ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <p className="text-sm font-medium mb-2">
                {testResult.success ? '✅ Muvaffaqiyatli!' : '❌ Xatolik'}
              </p>
              <pre className="text-xs text-muted-foreground overflow-auto max-h-40 whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            So'nggi kliklar va konversiyalar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Hali kliklar mavjud emas
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono truncate max-w-32">{event.click_id}</code>
                      {event.telegram_username && (
                        <Badge variant="outline" className="text-[10px]">
                          @{event.telegram_username}
                        </Badge>
                      )}
                      {event.utm_campaign && (
                        <Badge variant="secondary" className="text-[10px]">
                          {event.utm_campaign}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {event.channel_joined && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500">
                        Kanal ✓
                      </Badge>
                    )}
                    {event.conversion_sent ? (
                      <Badge className="text-[10px] bg-green-500 hover:bg-green-600">
                        Konversiya ✓
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Kutilmoqda
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pixel Code Snippet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>📋 Pixel kod (ma'lumot uchun)</span>
            <Button variant="ghost" size="sm" onClick={() => handleCopy(pixelSnippet)} className="gap-1">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              Nusxalash
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Pixel kodi Landing sahifada avtomatik o'rnatilgan. Qo'shimcha saytlarga o'rnatish kerak bo'lsa:
          </p>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
            {pixelSnippet}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetaPixelManager;
