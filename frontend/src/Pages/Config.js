import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Fuel,
  Target,
  Shield,
  Zap,
  Network,
  Database
} from 'lucide-react';

export default function Config() {
  const [config, setConfig] = useState({
    // Configurações de Rede
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    contractAddress: '',
    privateKey: '',
    
    // Configurações de Execução
    minProfitEth: 0.001,
    checkInterval: 5000,
    maxGasPrice: 100,
    maxSlippage: 0.5,
    
    // Configurações de Segurança
    useFlashbots: false,
    maxLoanAmount: 1000,
    emergencyStop: false,
    
    // Configurações de Log
    logLevel: 'info',
    logToFile: true,
    logToConsole: true,
    
    // Configurações Avançadas
    cacheDuration: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
    healthCheckInterval: 30000
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Carregar configurações salvas
    const savedConfig = localStorage.getItem('arbibot-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Validar configurações
      if (!config.rpcUrl || !config.contractAddress || !config.privateKey) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      if (config.minProfitEth < 0.0001) {
        throw new Error('Lucro mínimo deve ser pelo menos 0.0001 ETH');
      }

      if (config.maxGasPrice > 500) {
        throw new Error('Gas price máximo muito alto');
      }

      // Salvar no localStorage
      localStorage.setItem('arbibot-config', JSON.stringify(config));
      
      // Simular envio para o bot
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = () => {
    if (window.confirm('Tem certeza que deseja resetar todas as configurações?')) {
      setConfig({
        rpcUrl: 'https://rpc-amoy.polygon.technology',
        contractAddress: '',
        privateKey: '',
        minProfitEth: 0.001,
        checkInterval: 5000,
        maxGasPrice: 100,
        maxSlippage: 0.5,
        useFlashbots: false,
        maxLoanAmount: 1000,
        emergencyStop: false,
        logLevel: 'info',
        logToFile: true,
        logToConsole: true,
        cacheDuration: 10000,
        retryAttempts: 3,
        retryDelay: 1000,
        healthCheckInterval: 30000
      });
      localStorage.removeItem('arbibot-config');
      setMessage({ type: 'info', text: 'Configurações resetadas' });
    }
  };

  const getMessageIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-profit-green" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-loss-red" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-warning-orange" />;
    }
  };

  const getMessageColor = () => {
    switch (message.type) {
      case 'success':
        return 'bg-success-bg border-profit-green text-profit-green';
      case 'error':
        return 'bg-error-bg border-loss-red text-loss-red';
      default:
        return 'bg-warning-bg border-warning-orange text-warning-orange';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
          <p className="text-text-secondary">Configure os parâmetros do bot de arbitragem</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetConfig}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-bg hover:bg-loss-red hover:text-white transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
            Resetar
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-electric-blue text-white font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all duration-300"
          >
            {saving ? (
              <div className="spinner w-4 h-4"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Mensagem de Status */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 p-4 rounded-lg border ${getMessageColor()}`}
        >
          {getMessageIcon()}
          <span className="font-medium">{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações de Rede */}
        <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-5 h-5 text-electric-blue" />
            <h3 className="text-lg font-semibold text-text-primary">Configurações de Rede</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                RPC URL *
              </label>
              <input
                type="text"
                value={config.rpcUrl}
                onChange={(e) => handleInputChange('rpcUrl', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
                placeholder="https://rpc-amoy.polygon.technology"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Endereço do Contrato *
              </label>
              <input
                type="text"
                value={config.contractAddress}
                onChange={(e) => handleInputChange('contractAddress', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
                placeholder="0x..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Chave Privada *
              </label>
              <input
                type="password"
                value={config.privateKey}
                onChange={(e) => handleInputChange('privateKey', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
                placeholder="64 caracteres hex (sem 0x)"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Execução */}
        <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-profit-green" />
            <h3 className="text-lg font-semibold text-text-primary">Configurações de Execução</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Lucro Mínimo (ETH)
              </label>
              <input
                type="number"
                step="0.0001"
                value={config.minProfitEth}
                onChange={(e) => handleInputChange('minProfitEth', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Intervalo de Verificação (ms)
              </label>
              <input
                type="number"
                value={config.checkInterval}
                onChange={(e) => handleInputChange('checkInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Gas Price Máximo (gwei)
              </label>
              <input
                type="number"
                value={config.maxGasPrice}
                onChange={(e) => handleInputChange('maxGasPrice', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Slippage Máximo (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.maxSlippage}
                onChange={(e) => handleInputChange('maxSlippage', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Segurança */}
        <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-warning-orange" />
            <h3 className="text-lg font-semibold text-text-primary">Configurações de Segurança</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">
                Usar Flashbots (Proteção MEV)
              </label>
              <input
                type="checkbox"
                checked={config.useFlashbots}
                onChange={(e) => handleInputChange('useFlashbots', e.target.checked)}
                className="w-4 h-4 text-electric-blue bg-accent-bg border-border-color rounded focus:ring-electric-blue"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Valor Máximo de Empréstimo (ETH)
              </label>
              <input
                type="number"
                value={config.maxLoanAmount}
                onChange={(e) => handleInputChange('maxLoanAmount', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">
                Parada de Emergência
              </label>
              <input
                type="checkbox"
                checked={config.emergencyStop}
                onChange={(e) => handleInputChange('emergencyStop', e.target.checked)}
                className="w-4 h-4 text-loss-red bg-accent-bg border-border-color rounded focus:ring-loss-red"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Log */}
        <div className="bg-secondary-bg border border-border-color rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-electric-blue" />
            <h3 className="text-lg font-semibold text-text-primary">Configurações de Log</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Nível de Log
              </label>
              <select
                value={config.logLevel}
                onChange={(e) => handleInputChange('logLevel', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-accent-bg border border-border-color text-text-primary outline-none focus:border-electric-blue"
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">
                Salvar Logs em Arquivo
              </label>
              <input
                type="checkbox"
                checked={config.logToFile}
                onChange={(e) => handleInputChange('logToFile', e.target.checked)}
                className="w-4 h-4 text-electric-blue bg-accent-bg border-border-color rounded focus:ring-electric-blue"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">
                Mostrar Logs no Console
              </label>
              <input
                type="checkbox"
                checked={config.logToConsole}
                onChange={(e) => handleInputChange('logToConsole', e.target.checked)}
                className="w-4 h-4 text-electric-blue bg-accent-bg border-border-color rounded focus:ring-electric-blue"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 