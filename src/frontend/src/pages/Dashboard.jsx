import React, { useState, useEffect, useCallback } from "react";
import { ArbitrageOpportunity } from "../entities/ArbitrageOpportunity";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  RefreshCw, 
  Zap, 
  AlertCircle,
  TrendingUp,
  Filter,
  Search
} from "lucide-react";
import { Input } from "../components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from "../utils";

import StatsOverview from "../components/dashboard/StatsOverview";
import OpportunityCard from "../components/dashboard/OpportunityCard";
import PriceChart from "../components/dashboard/PriceChart";

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadOpportunities = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ArbitrageOpportunity.list("-created_date", 50);
      setOpportunities(data);
    } catch (error) {
      console.error("Error loading opportunities:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadOpportunities();
    // Simula atualizações em tempo real
    const interval = setInterval(loadOpportunities, 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [loadOpportunities]);

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadOpportunities();
    setIsRefreshing(false);
  };

  // Debounce da busca para melhor performance
  const debouncedSearch = useCallback(
    debounce((term) => setSearchTerm(term), 300),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesFilter = filter === 'all' || opp.status === filter;
    const matchesSearch = !searchTerm || 
                         opp.token_pair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.dex_buy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.dex_sell?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-primary-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 gap-4"
        >
          <div className="w-full lg:w-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-primary-text">
              Arbitragem DeFi
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-secondary-text">
              Monitore oportunidades em tempo real
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={isRefreshing}
              className="transition-all duration-300 border-border bg-secondary-bg text-primary-text hover:bg-accent-bg"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-profit text-black text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="hidden sm:inline">Sistema Ativo</span>
              <span className="sm:hidden">Ativo</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <StatsOverview opportunities={opportunities} />

        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row gap-4 mb-6"
        >
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-text" />
              <Input
                placeholder="Buscar por token ou DEX..."
                onChange={handleSearchChange}
                className="pl-10 border-border bg-secondary-bg text-primary-text"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'active', label: 'Ativas' },
              { key: 'executed', label: 'Executadas' },
              { key: 'expired', label: 'Expiradas' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
                className={`transition-all duration-300 ${
                  filter === key 
                    ? 'bg-electric text-white' 
                    : 'border-border text-secondary-text bg-transparent hover:bg-secondary-bg'
                }`}
                size="sm"
              >
                {label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Opportunities List */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-primary-text">
                  Oportunidades ({filteredOpportunities.length})
                </h2>
                {filteredOpportunities.filter(opp => opp.status === 'active').length > 0 && (
                  <Badge className="animate-pulse border-0 px-3 py-1 bg-profit text-black self-start sm:self-auto">
                    <Zap className="w-3 h-3 mr-1" />
                    {filteredOpportunities.filter(opp => opp.status === 'active').length} prontas
                  </Badge>
                )}
              </div>

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <motion.div
                        key={i}
                        className="h-32 sm:h-48 rounded-lg animate-pulse bg-secondary-bg"
                      />
                    ))}
                  </div>
                ) : filteredOpportunities.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-secondary-text" />
                    <h3 className="text-base sm:text-lg font-medium mb-2 text-primary-text">
                      Nenhuma oportunidade encontrada
                    </h3>
                    <p className="text-sm sm:text-base text-secondary-text">
                      Aguarde ou ajuste os filtros de busca
                    </p>
                  </motion.div>
                ) : (
                  filteredOpportunities.map((opportunity, index) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      index={index}
                    />
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Chart Sidebar */}
          <div className="space-y-6">
            <PriceChart opportunities={opportunities} />
            
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden lg:block"
            >
              <Card className="border border-border bg-secondary-bg">
                <CardHeader>
                  <CardTitle className="text-primary-text text-lg">
                    Ações Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start text-white"
                    style={{
                      background: 'linear-gradient(135deg, #00D4FF, #00FF88)'
                    }}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Auto-Executar Melhores
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-border text-primary-text bg-transparent hover:bg-accent-bg"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Análise Detalhada
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-border text-primary-text bg-transparent hover:bg-accent-bg"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Configurar Alertas
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}