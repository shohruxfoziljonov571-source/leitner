import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { MousePointerClick, Bot, Users, CheckCircle, ArrowDown } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface FunnelData {
  total_clicks: number;
  bot_starts: number;
  channel_joins: number;
  conversions_sent: number;
  by_campaign: {
    campaign: string;
    source: string;
    clicks: number;
    bot_starts: number;
    channel_joins: number;
    conversions: number;
  }[];
  daily_clicks: {
    date: string;
    clicks: number;
    bot_starts: number;
    channel_joins: number;
    conversions: number;
  }[];
}

const FunnelAnalytics: React.FC = () => {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');

  useEffect(() => {
    const fetchFunnel = async () => {
      setLoading(true);
      const { data: result, error } = await supabase.rpc('get_ad_funnel_stats', {
        p_days: parseInt(days),
      });
      if (!error && result) {
        setData(result as unknown as FunnelData);
      }
      setLoading(false);
    };
    fetchFunnel();
  }, [days]);

  if (loading) {
    return <div className="text-muted-foreground text-center py-8">Yuklanmoqda...</div>;
  }

  if (!data) {
    return <div className="text-muted-foreground text-center py-8">Ma'lumot topilmadi</div>;
  }

  const funnelSteps = [
    { label: 'Clicks', value: data.total_clicks, icon: MousePointerClick, color: 'bg-blue-500' },
    { label: 'Bot Start', value: data.bot_starts, icon: Bot, color: 'bg-indigo-500' },
    { label: 'Channel Join', value: data.channel_joins, icon: Users, color: 'bg-purple-500' },
    { label: 'Conversion', value: data.conversions_sent, icon: CheckCircle, color: 'bg-green-500' },
  ];

  const getRate = (current: number, total: number) => {
    if (total === 0) return '0%';
    return `${((current / total) * 100).toFixed(1)}%`;
  };

  const dailyData = [...(data.daily_clicks || [])].reverse();

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ad Funnel Analytics</h3>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 kun</SelectItem>
            <SelectItem value="14">14 kun</SelectItem>
            <SelectItem value="30">30 kun</SelectItem>
            <SelectItem value="90">90 kun</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visual Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konversiya voronkasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnelSteps.map((step, i) => {
              const maxVal = funnelSteps[0].value || 1;
              const widthPct = Math.max(((step.value / maxVal) * 100), 8);
              const prevValue = i > 0 ? funnelSteps[i - 1].value : step.value;
              const Icon = step.icon;

              return (
                <div key={step.label}>
                  {i > 0 && (
                    <div className="flex items-center justify-center py-1">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground ml-1">
                        {getRate(step.value, prevValue)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`${step.color} text-white rounded-lg px-4 py-3 flex items-center justify-between mx-auto transition-all`}
                    style={{ width: `${widthPct}%`, minWidth: '180px' }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    <span className="font-bold">{step.value.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Umumiy konversiya: {getRate(data.conversions_sent, data.total_clicks)}
          </p>
        </CardContent>
      </Card>

      {/* Daily trend chart */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kunlik trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => new Date(d).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-popover p-3 rounded-lg shadow-lg border text-sm">
                            <p className="font-medium mb-1">{new Date(label).toLocaleDateString('uz-UZ')}</p>
                            <p className="text-blue-500">Clicks: {payload[0]?.value}</p>
                            <p className="text-indigo-500">Bot Start: {payload[1]?.value}</p>
                            <p className="text-purple-500">Channel Join: {payload[2]?.value}</p>
                            <p className="text-green-500">Conversion: {payload[3]?.value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="clicks" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="bot_starts" fill="hsl(239, 84%, 67%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="channel_joins" fill="hsl(271, 91%, 65%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="conversions" fill="hsl(142, 76%, 36%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign breakdown table */}
      {data.by_campaign.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kampaniyalar bo'yicha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Kampaniya</th>
                    <th className="text-left py-2 pr-4">Manba</th>
                    <th className="text-right py-2 pr-4">Clicks</th>
                    <th className="text-right py-2 pr-4">Bot</th>
                    <th className="text-right py-2 pr-4">Join</th>
                    <th className="text-right py-2 pr-4">Conv</th>
                    <th className="text-right py-2">CVR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_campaign.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium truncate max-w-[120px]">{row.campaign}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.source}</td>
                      <td className="py-2 pr-4 text-right">{row.clicks}</td>
                      <td className="py-2 pr-4 text-right">{row.bot_starts}</td>
                      <td className="py-2 pr-4 text-right">{row.channel_joins}</td>
                      <td className="py-2 pr-4 text-right">{row.conversions}</td>
                      <td className="py-2 text-right font-medium">
                        {getRate(row.conversions, row.clicks)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FunnelAnalytics;
