import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  DollarSign,
  Fuel
} from 'lucide-react';

export default function ExecutionHistory({ executions }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-profit-green" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-loss-red" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-orange" />;
      default:
        return <Clock className="w-4 h-4 text-text-secondary" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-profit-green';
      case 'failed':
        return 'text-loss-red';
      case 'pending':
        return 'text-warning-orange';
      default:
        return 'text-text-secondary';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return timestamp.toLocaleDateString('pt-BR');
  };

  const formatGasUsed = (gasUsed) => {
    return (gasUsed / 1000).toFixed(1) + 'k';
  };

  const formatGasPrice = (gasPrice) => {
    return gasPrice + ' gwei';
  };

  return (
    <div className="space-y-3">
      {executions.map((execution, index) => (
        <motion.div
          key={execution.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-4 rounded-lg bg-accent-bg border border-border-color hover:border-electric-blue transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(execution.status)}
              <div>
                <p className="font-medium text-text-primary">
                  {execution.token_pair}
                </p>
                <p className="text-sm text-text-secondary">
                  {formatTimeAgo(execution.timestamp)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Lucro */}
            <div className="text-right">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-text-secondary" />
                <span className={`font-bold ${execution.profit > 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                  ${execution.profit.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-text-secondary">Lucro</p>
            </div>

            {/* Gas */}
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Fuel className="w-4 h-4 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  {formatGasUsed(execution.gas_used)}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {formatGasPrice(execution.gas_price)}
              </p>
            </div>

            {/* Status */}
            <div className="text-right">
              <span className={`text-sm font-medium ${getStatusColor(execution.status)}`}>
                {execution.status === 'success' ? 'Sucesso' : 
                 execution.status === 'failed' ? 'Falhou' : 'Pendente'}
              </span>
              {execution.error && (
                <p className="text-xs text-loss-red mt-1">{execution.error}</p>
              )}
            </div>

            {/* Link da transação */}
            <a
              href={`https://amoy.polygonscan.com/tx/${execution.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-electric-blue hover:text-white transition-all duration-300"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      ))}

      {executions.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary">Nenhuma execução encontrada</p>
        </div>
      )}
    </div>
  );
} 