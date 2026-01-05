import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AccuracyChartProps {
  correct: number;
  incorrect: number;
}

const AccuracyChart: React.FC<AccuracyChartProps> = ({ correct, incorrect }) => {
  const total = correct + incorrect;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const data = [
    { name: 'To\'g\'ri', value: correct, color: 'hsl(var(--primary))' },
    { name: 'Noto\'g\'ri', value: incorrect, color: 'hsl(var(--destructive))' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 rounded-xl shadow-elevated border border-border">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">{payload[0].value} ta javob</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-3xl shadow-card p-6"
    >
      <h3 className="font-display font-semibold text-lg mb-4">
        Aniqlik darajasi
      </h3>
      <div className="h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="font-display font-bold text-2xl text-primary">{accuracy}%</p>
        </div>
      </div>
    </motion.div>
  );
};

export default AccuracyChart;
