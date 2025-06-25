import React, { useState, useEffect } from "react";
import { ArbitrageOpportunity } from "../Entities/index.js";
// import { Button } from "../Components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/ui/card";
// import { Badge } from "../Components/ui/badge";
// import { Input } from "../Components/ui/input";
import { 
  RefreshCw, 
  Zap, 
  AlertCircle,
  TrendingUp,
  Filter,
  Search,
  DollarSign,
  Activity,
  Clock,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import StatsOverview from "../Components/dashboard/StatsOverview";
import OpportunityCard from "../Components/dashboard/OpportunityCard";
import PriceChart from "../Components/dashboard/PriceChart";
import ExecutionHistory from '../Components/dashboard/ExecutionHistory';

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Buscar oportunidades reais do backend
  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/arbitrage-opportunities");
      const data = await res.json();
      setOpportunities(data);
    } catch (err) {
      setOpportunities([]);
    }
    setLoading(false);
  };

  // Buscar execuções reais do backend
  const fetchExecutions = async () => {
    try {
      const res = await fetch("http://localhost:8000/executions");
      const data = await res.json();
      setExecutions(Array.isArray(data) ? data : []);
    } catch (err) {
      setExecutions([]);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    fetchExecutions();
  }, []);

  const filteredOpportunities = opportunities.filter(opp => {
    if (filter === 'all') return true;
    return opp.status === filter;
  });

  const refreshData = () => {
    fetchOpportunities();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-text-secondary">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary">Monitoramento em tempo real das oportunidades de arbitragem</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-bg hover:bg-electric-blue hover:text-white transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <StatsOverview opportunities={opportunities} />

      {/* Gráfico de Preços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriceChart opportunities={opportunities} />
        
        {/* Execuções Recentes */}
        <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Execuções Recentes</h3>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Últimas 24h</span>
            </div>
          </div>
          {Array.isArray(executions) && executions.map((execution, index) => (
            <ExecutionHistory key={execution.id} execution={execution} index={index} />
          ))}
        </div>
      </div>

      {/* Filtros e Oportunidades */}
      <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-primary">Oportunidades de Arbitragem</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-accent-bg">
              <Search className="w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Buscar por token..."
                className="bg-transparent border-none outline-none text-text-primary placeholder-text-secondary"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none"
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="executed">Executadas</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opportunity, index) => (
            <motion.div
              key={opportunity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <OpportunityCard opportunity={opportunity} index={index} />
            </motion.div>
          ))}
        </div>

        {filteredOpportunities.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">Nenhuma oportunidade encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
} 