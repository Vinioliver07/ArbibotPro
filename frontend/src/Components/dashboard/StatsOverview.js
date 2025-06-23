import React from 'react';
import { motion } from 'framer-motion';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Clock,
  Zap,
  Target
} from "lucide-react";

export default function StatsOverview({ opportunities }) {
  const activeOpportunities = opportunities.filter(opp => opp.status === 'active').length;
  const totalPotentialProfit = opportunities
    .filter(opp => opp.status === 'active')
    .reduce((sum, opp) => sum + (opp.net_profit || 0), 0);
  const avgSpread = opportunities
    .filter(opp => opp.status === 'active')
    .reduce((sum, opp) => sum + (opp.spread_percentage || 0), 0) / (activeOpportunities || 1);
  const bestOpportunity = opportunities
    .filter(opp => opp.status === 'active')
    .sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0))[0];

  const stats = [
    {
      title: "Oportunidades Ativas",
      value: activeOpportunities,
      icon: Activity,
      gradient: "from-blue-400 to-blue-600",
      textColor: "var(--electric-blue)"
    },
    {
      title: "Lucro Potencial",
      value: `$${totalPotentialProfit.toFixed(0)}`,
      icon: DollarSign,
      gradient: "from-green-400 to-green-600", 
      textColor: "var(--profit-green)"
    },
    {
      title: "Spread Médio",
      value: `${avgSpread.toFixed(2)}%`,
      icon: TrendingUp,
      gradient: "from-purple-400 to-purple-600",
      textColor: "#a78bfa"
    },
    {
      title: "Melhor Oportunidade",
      value: bestOpportunity ? `$${bestOpportunity.net_profit.toFixed(0)}` : "$0",
      icon: Target,
      gradient: "from-orange-400 to-orange-600",
      textColor: "#fb923c"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="relative overflow-hidden border transition-all duration-300 hover:shadow-xl"
                style={{
                  background: 'var(--secondary-bg)',
                  borderColor: 'var(--border-color)'
                }}>
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full -mr-8 -mt-8"
                 style={{background: stat.textColor}}>
            </div>
            
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                {stat.title}
              </CardTitle>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{background: `${stat.textColor}20`}}>
                <stat.icon className="w-4 h-4" style={{color: stat.textColor}} />
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {stat.value}
                </span>
                {stat.title === "Lucro Potencial" && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-4 h-4" style={{color: stat.textColor}} />
                  </motion.div>
                )}
              </div>
              <p className="text-xs mt-1" style={{color: 'var(--text-secondary)'}}>
                {stat.title === "Oportunidades Ativas" && "Em tempo real"}
                {stat.title === "Lucro Potencial" && "Próximas 24h"}
                {stat.title === "Spread Médio" && "Média atual"}
                {stat.title === "Melhor Oportunidade" && bestOpportunity?.token_pair}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
} 