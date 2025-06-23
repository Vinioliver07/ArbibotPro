import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
        <div className="p-2 sm:p-3 rounded-lg border shadow-lg bg-secondary-bg border-border text-primary-text">
          <p className="font-medium text-xs sm:text-sm">{`Horário: ${label}`}</p>
          <p className="text-xs sm:text-sm text-profit">
            {`Spread: ${payload[0].value.toFixed(2)}%`}
          </p>
          <p className="text-xs sm:text-sm text-electric">
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
      className="w-full"
    >
      <Card className="border bg-secondary-bg border-border">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-primary-text text-base sm:text-lg">
            <div className="w-2 h-2 rounded-full animate-pulse bg-profit" />
            <span className="hidden sm:inline">Histórico de Spreads (24h)</span>
            <span className="sm:hidden">Spreads 24h</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="h-48 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#a0a0b8' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#a0a0b8' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  width={40}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#a0a0b8' }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="spread" 
                  stroke="#00FF88"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: '#00FF88' }}
                  yAxisId="left"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#00D4FF"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: '#00D4FF' }}
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