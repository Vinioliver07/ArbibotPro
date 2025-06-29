import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  TrendingUp, 
  Clock, 
  Zap, 
  ArrowRight, 
  Target,
  Fuel
} from "lucide-react";
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function OpportunityCard({ opportunity, index }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--profit-green)';
      case 'executed': return 'var(--electric-blue)';
      case 'expired': return 'var(--text-secondary)';
      case 'insufficient': return 'var(--loss-red)';
      default: return 'var(--text-secondary)';
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
    >
      <Card className="border transition-all duration-300 hover:shadow-2xl relative overflow-hidden"
            style={{
              background: 'var(--secondary-bg)',
              borderColor: 'var(--border-color)'
            }}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5"
             style={{
               background: `linear-gradient(135deg, ${getStatusColor(opportunity.status)}, transparent)`
             }}>
        </div>
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                   style={{background: 'var(--accent-bg)'}}>
                <ArrowRight className="w-5 h-5" style={{color: 'var(--electric-blue)'}} />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>
                  {opportunity.token_pair}
                </h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  {opportunity.dex_buy} → {opportunity.dex_sell}
                </p>
              </div>
            </div>
            <Badge 
              className="border-0 font-medium px-3 py-1"
              style={{
                background: `${getStatusColor(opportunity.status)}20`,
                color: getStatusColor(opportunity.status)
              }}
            >
              {getStatusText(opportunity.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                Spread
              </p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" style={{color: 'var(--profit-green)'}} />
                <span className="font-bold text-lg" style={{color: 'var(--profit-green)'}}>
                  {opportunity.spread_percentage?.toFixed(2)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                Lucro Líquido
              </p>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" style={{color: 'var(--electric-blue)'}} />
                <span className="font-bold text-lg" style={{color: 'var(--electric-blue)'}}>
                  ${opportunity.net_profit?.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center p-2 rounded-lg" style={{background: 'var(--accent-bg)'}}>
              <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Compra</p>
              <p className="font-medium" style={{color: 'var(--text-primary)'}}>
                ${opportunity.price_buy?.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{background: 'var(--accent-bg)'}}>
              <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Venda</p>
              <p className="font-medium" style={{color: 'var(--text-primary)'}}>
                ${opportunity.price_sell?.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{background: 'var(--accent-bg)'}}>
              <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Gás</p>
              <div className="flex items-center justify-center gap-1">
                <Fuel className="w-3 h-3" style={{color: 'var(--loss-red)'}} />
                <p className="font-medium" style={{color: 'var(--text-primary)'}}>
                  ${opportunity.gas_cost?.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
              <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
                {opportunity.execution_window}s restantes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" 
                   style={{background: opportunity.confidence_score > 80 ? 'var(--profit-green)' : 'var(--loss-red)'}}></div>
              <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
                {opportunity.confidence_score}% confiança
              </span>
            </div>
          </div>

          {opportunity.status === 'active' && (
            <Button 
              className="w-full mt-4 font-medium transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--electric-blue), var(--profit-green))',
                color: '#ffffff'
              }}
            >
              <Zap className="w-4 h-4 mr-2" />
              Executar Arbitragem
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
} 