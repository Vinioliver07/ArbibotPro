import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { 
  TrendingUp, 
  Clock, 
  Zap, 
  ArrowRight, 
  Target,
  Fuel
} from "lucide-react";

export default function OpportunityCard({ opportunity, index }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#00FF88';
      case 'executed': return '#00D4FF';
      case 'expired': return '#a0a0b8';
      case 'insufficient': return '#FF4757';
      default: return '#a0a0b8';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'executed': return 'Executada';
      case 'expired': return 'Expirada';
      case 'insufficient': return 'Insuficiente';
      default: return status;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="w-full"
    >
      <Card className="border transition-all duration-300 hover:shadow-2xl relative overflow-hidden bg-secondary-bg border-border">
        <div 
          className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 opacity-5"
          style={{
            background: `linear-gradient(135deg, ${getStatusColor(opportunity.status)}, transparent)`
          }}
        />
        
        <CardHeader className="pb-3 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-accent-bg">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-electric" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base sm:text-lg text-primary-text truncate">
                  {opportunity.token_pair}
                </h3>
                <p className="text-xs sm:text-sm text-secondary-text truncate">
                  {opportunity.dex_buy} → {opportunity.dex_sell}
                </p>
              </div>
            </div>
            <Badge 
              className="border-0 font-medium px-2 py-1 sm:px-3 text-xs self-start sm:self-auto"
              style={{
                backgroundColor: `${getStatusColor(opportunity.status)}20`,
                color: getStatusColor(opportunity.status)
              }}
            >
              {getStatusText(opportunity.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-secondary-text">
                Spread
              </p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-profit" />
                <span className="font-bold text-base sm:text-lg text-profit">
                  {opportunity.spread_percentage?.toFixed(2)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-secondary-text">
                Lucro Líquido
              </p>
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-electric" />
                <span className="font-bold text-base sm:text-lg text-electric">
                  ${opportunity.net_profit?.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="text-center p-2 rounded-lg bg-accent-bg">
              <p className="text-xs text-secondary-text mb-1">Compra</p>
              <p className="font-medium text-primary-text text-xs sm:text-sm">
                ${opportunity.price_buy?.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-accent-bg">
              <p className="text-xs text-secondary-text mb-1">Venda</p>
              <p className="font-medium text-primary-text text-xs sm:text-sm">
                ${opportunity.price_sell?.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-accent-bg">
              <p className="text-xs text-secondary-text mb-1">Gás</p>
              <div className="flex items-center justify-center gap-1">
                <Fuel className="w-3 h-3 text-loss" />
                <p className="font-medium text-primary-text text-xs sm:text-sm">
                  ${opportunity.gas_cost?.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-secondary-text" />
              <span className="text-xs sm:text-sm text-secondary-text">
                {opportunity.execution_window}s restantes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{
                  backgroundColor: opportunity.confidence_score > 80 ? '#00FF88' : '#FF4757'
                }}
              />
              <span className="text-xs sm:text-sm font-medium text-primary-text">
                {opportunity.confidence_score}% confiança
              </span>
            </div>
          </div>

          {opportunity.status === 'active' && (
            <Button 
              className="w-full mt-4 font-medium transition-all duration-300 hover:scale-105 h-10 sm:h-12 text-sm sm:text-base"
              style={{
                background: 'linear-gradient(135deg, #00D4FF, #00FF88)',
                color: '#ffffff'
              }}
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Executar Arbitragem
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}