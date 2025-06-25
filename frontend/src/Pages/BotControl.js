import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Power, 
  Settings, 
  Activity, 
  Clock, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Target,
  Fuel
} from 'lucide-react';

export default function BotControl() {
  const [botStatus, setBotStatus] = useState('stopped'); // stopped, starting, running, stopping
  const [currentOpportunity, setCurrentOpportunity] = useState(null);
  const [stats, setStats] = useState({
    totalExecutions: 0,
    successfulExecutions: 0,
    totalProfit: 0,
    averageGasUsed: 0,
    uptime: 0,
    lastExecution: null
  });
  const [logs, setLogs] = useState([]);

  // Buscar status real do backend ao carregar
  useEffect(() => {
    fetch('http://localhost:8000/bot-status')
      .then(res => res.json())
      .then(data => {
        setBotStatus(data.active ? 'running' : 'stopped');
      });
    fetch('http://localhost:8000/bot-logs')
      .then(res => res.json())
      .then(data => setLogs(Array.isArray(data) ? data : []));
  }, []);

  // Simular dados do bot
  useEffect(() => {
    const mockStats = {
      totalExecutions: 47,
      successfulExecutions: 42,
      totalProfit: 2847.50,
      averageGasUsed: 245000,
      uptime: 3600, // segundos
      lastExecution: new Date(Date.now() - 2 * 60 * 1000)
    };
    setStats(mockStats);

    const mockLogs = [
      { id: 1, type: 'info', message: 'Bot iniciado com sucesso', timestamp: new Date() },
      { id: 2, type: 'success', message: 'Arbitragem executada: WMATIC/USDC - Lucro: $125.50', timestamp: new Date(Date.now() - 2 * 60 * 1000) },
      { id: 3, type: 'warning', message: 'Gas price alto detectado: 80 gwei', timestamp: new Date(Date.now() - 5 * 60 * 1000) },
      { id: 4, type: 'error', message: 'Falha na execução: Insufficient liquidity', timestamp: new Date(Date.now() - 15 * 60 * 1000) }
    ];
    setLogs(mockLogs);
  }, []);

  const startBot = async () => {
    setBotStatus('starting');
    await fetch('http://localhost:8000/start-bot', { method: 'POST' });
    setTimeout(() => {
      setBotStatus('running');
      addLog('info', 'Bot iniciado com sucesso');
    }, 2000);
  };

  const stopBot = async () => {
    setBotStatus('stopping');
    await fetch('http://localhost:8000/stop-bot', { method: 'POST' });
    setTimeout(() => {
      setBotStatus('stopped');
      addLog('info', 'Bot parado');
    }, 1000);
  };

  const addLog = async (type, message) => {
    const newLog = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    };
    await fetch('http://localhost:8000/bot-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    });
    // Atualiza logs após adicionar
    fetch('http://localhost:8000/bot-logs')
      .then(res => res.json())
      .then(data => setLogs(Array.isArray(data) ? data : []));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-profit-green';
      case 'starting':
      case 'stopping':
        return 'text-warning-orange';
      case 'stopped':
        return 'text-loss-red';
      default:
        return 'text-text-secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'running':
        return 'Executando';
      case 'starting':
        return 'Iniciando...';
      case 'stopping':
        return 'Parando...';
      case 'stopped':
        return 'Parado';
      default:
        return 'Desconhecido';
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-profit-green" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-loss-red" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-orange" />;
      default:
        return <Activity className="w-4 h-4 text-electric-blue" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Controle do Bot</h1>
          <p className="text-text-secondary">Gerencie e monitore o bot de arbitragem</p>
        </div>
      </div>

      {/* Status e Controles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Principal */}
        <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              botStatus === 'running' ? 'bg-success-bg border-2 border-profit-green' :
              botStatus === 'stopped' ? 'bg-error-bg border-2 border-loss-red' :
              'bg-warning-bg border-2 border-warning-orange'
            }`}>
              <Power className={`w-8 h-8 ${
                botStatus === 'running' ? 'text-profit-green' :
                botStatus === 'stopped' ? 'text-loss-red' :
                'text-warning-orange'
              }`} />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Status do Bot
            </h3>
            <p className={`text-xl font-bold mb-4 ${getStatusColor(botStatus)}`}>
              {getStatusText(botStatus)}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={startBot}
                disabled={botStatus === 'running' || botStatus === 'starting'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-profit-green text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <Play className="w-4 h-4" />
                Iniciar Bot
              </button>
              
              <button
                onClick={stopBot}
                disabled={botStatus === 'stopped' || botStatus === 'stopping'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-loss-red text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <Pause className="w-4 h-4" />
                Parar Bot
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Estatísticas</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-electric-blue" />
                <span className="text-text-secondary">Execuções</span>
              </div>
              <span className="font-bold text-text-primary">
                {stats.successfulExecutions}/{stats.totalExecutions}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-profit-green" />
                <span className="text-text-secondary">Lucro Total</span>
              </div>
              <span className="font-bold text-profit-green">
                ${stats.totalProfit.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-warning-orange" />
                <span className="text-text-secondary">Gas Médio</span>
              </div>
              <span className="font-bold text-text-primary">
                {(stats.averageGasUsed / 1000).toFixed(1)}k
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-electric-blue" />
                <span className="text-text-secondary">Uptime</span>
              </div>
              <span className="font-bold text-text-primary">
                {formatUptime(stats.uptime)}
              </span>
            </div>
          </div>
        </div>

        {/* Oportunidade Atual */}
        <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Oportunidade Atual</h3>
          {currentOpportunity ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Par</span>
                <span className="font-bold text-text-primary">{currentOpportunity.token_pair}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Spread</span>
                <span className="font-bold text-profit-green">{currentOpportunity.spread}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Lucro Estimado</span>
                <span className="font-bold text-profit-green">${currentOpportunity.profit}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary">Nenhuma oportunidade ativa</p>
            </div>
          )}
        </div>
      </div>

      {/* Logs em Tempo Real */}
      <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Logs em Tempo Real</h3>
          <button
            onClick={() => setLogs([])}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-accent-bg hover:bg-electric-blue hover:text-white transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
            Limpar
          </button>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {Array.isArray(logs) && logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-accent-bg"
            >
              {getLogIcon(log.type)}
              <div className="flex-1">
                <p className="text-sm text-text-primary">{log.message}</p>
                <p className="text-xs text-text-secondary">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR') : ''}
                </p>
              </div>
            </motion.div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary">Nenhum log disponível</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 