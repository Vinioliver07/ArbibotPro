import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
      textColor: "#00D4FF",
      description: "Em tempo real"
    },
    {
      title: "Lucro Potencial",
      value: `$${totalPotentialProfit.toFixed(0)}`,
      icon: DollarSign,
      textColor: "#00FF88",
      description: "Próximas 24h"
    },
    {
      title: "Spread Médio",
      value: `${avgSpread.toFixed(2)}%`,
      icon: TrendingUp,
      textColor: "#a78bfa",
      description: "Média atual"
    },
    {
      title: "Melhor Oportunidade",
      value: bestOpportunity ? `$${bestOpportunity.net_profit.toFixed(0)}` : "$0",
      icon: Target,
      textColor: "#fb923c",
      description: bestOpportunity?.token_pair || "Nenhuma"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="w-full"
        >
          <Card className="relative overflow-hidden border transition-all duration-300 hover:shadow-xl bg-secondary-bg border-border">
            <div 
              className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 opacity-10 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8"
              style={{backgroundColor: stat.textColor}}
            />
            
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-secondary-text">
                {stat.title}
              </CardTitle>
              <div 
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
                style={{backgroundColor: `${stat.textColor}20`}}
              >
                <stat.icon className="w-3 h-3 sm:w-4 sm:h-4" style={{color: stat.textColor}} />
              </div>
            </CardHeader>
            
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold text-primary-text">
                  {stat.value}
                </span>
                {stat.title === "Lucro Potencial" && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" style={{color: stat.textColor}} />
                  </motion.div>
                )}
              </div>
              <p className="text-xs mt-1 text-secondary-text truncate">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}