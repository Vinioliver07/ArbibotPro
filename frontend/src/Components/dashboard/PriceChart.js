import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

export default function PriceChart({ opportunities }) {
  // Simula dados históricos de spread
  const generateChartData = () => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date();
      time.setHours(time.getHours() - i);
      data.push({
        time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        spread: Math.random() * 3 + 0.5,
        profit: Math.random() * 500 + 100
      });
    }
    return data;
  };

  const chartData = generateChartData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg border shadow-lg"
             style={{
               background: 'var(--secondary-bg)',
               borderColor: 'var(--border-color)',
               color: 'var(--text-primary)'
             }}>
          <p className="font-medium">{`Horário: ${label}`}</p>
          <p style={{color: 'var(--profit-green)'}}>
            {`Spread: ${payload[0].value.toFixed(2)}%`}
          </p>
          <p style={{color: 'var(--electric-blue)'}}>
            {`Lucro: $${payload[1].value.toFixed(0)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border"
            style={{
              background: 'var(--secondary-bg)',
              borderColor: 'var(--border-color)'
            }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{background: 'var(--profit-green)'}}></div>
            Histórico de Spreads (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="spread" 
                  stroke="var(--profit-green)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--profit-green)' }}
                  yAxisId="left"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="var(--electric-blue)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--electric-blue)' }}
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 