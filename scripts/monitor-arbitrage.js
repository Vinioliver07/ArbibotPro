const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const winston = require('winston');
const { createLogger, format, transports } = winston;
require('dotenv').config();

// ========== CONFIGURAÇÃO DE LOGS ==========
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
    format.colorize()
  ),
  defaultMeta: { service: 'arbitrage-bot' },
  transports: [
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// ========== CONFIGURAÇÕES AVANÇADAS ==========
class AdvancedArbitrageBot {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.wsConnections = new Map();
    this.gasOracle = null;
    this.isRunning = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.lastGasUpdate = 0;
    this.gasUpdateInterval = 30000; // 30 segundos
    
    // Configurações de gas dinâmico
    this.gasConfig = {
      baseGasPrice: ethers.parseUnits('30', 'gwei'),
      maxGasPrice: ethers.parseUnits('200', 'gwei'),
      priorityFeePerGas: ethers.parseUnits('2', 'gwei'),
      randomizationRange: 0.1, // 10% de randomização
      rushMode: false // Modo de pressa para oportunidades urgentes
    };

    // Configurações de proteção MEV
    this.mevProtection = {
      enabled: true,
      flashbotsRelay: 'https://relay.flashbots.net',
      privateMempool: true,
      maxBlocksToWait: 5,
      bundleSubmissionDelay: 100 // ms
    };

    // DEXs suportadas com endereços atualizados
    this.dexConfig = {
      uniswapV2: {
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        name: 'Uniswap V2'
      },
      sushiswap: {
        router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
        factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
        name: 'SushiSwap'
      },
      quickswap: {
        router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
        factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
        name: 'QuickSwap'
      }
    };

    this.initializeDirectories();
  }

  // ========== INICIALIZAÇÃO ==========
  initializeDirectories() {
    const dirs = ['logs', 'data', 'backups'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async initialize() {
    try {
      logger.info('🚀 Inicializando ArbiBot Pro Advanced...');
      
      // Configurar provider com fallbacks
      await this.setupProvider();
      
      // Configurar contratos
      await this.setupContracts();
      
      // Inicializar oráculo de gas
      await this.initializeGasOracle();
      
      // Configurar conexões WebSocket
      await this.setupWebSocketConnections();
      
      // Iniciar monitoramento
      this.startMonitoring();
      
      logger.info('✅ ArbiBot Pro inicializado com sucesso!');
      
    } catch (error) {
      logger.error('❌ Erro na inicialização:', error);
      throw error;
    }
  }

  async setupProvider() {
    const providers = [
      process.env.RPC_URL_PRIMARY,
      process.env.RPC_URL_BACKUP,
      process.env.RPC_URL_FALLBACK
    ].filter(Boolean);

    for (const rpcUrl of providers) {
      try {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        await this.provider.getBlockNumber();
        logger.info(`✅ Conectado ao provider: ${rpcUrl}`);
        break;
      } catch (error) {
        logger.warn(`⚠️ Falha no provider: ${rpcUrl}`, error.message);
      }
    }

    if (!this.provider) {
      throw new Error('Todos os providers falharam');
    }

    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    logger.info(`📝 Wallet configurada: ${this.signer.address}`);
  }

  async setupContracts() {
    const contractAddress = process.env.ARBITRAGE_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error('ARBITRAGE_CONTRACT_ADDRESS não configurado');
    }

    // Carregar ABI do contrato
    const artifactPath = path.join(__dirname, '../artifacts/contracts/ArbitrageBot.sol/ArbitrageBot.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    this.contract = new ethers.Contract(contractAddress, artifact.abi, this.signer);
    logger.info(`📄 Contrato carregado: ${contractAddress}`);

    // Validar propriedade do contrato
    const owner = await this.contract.owner();
    if (owner.toLowerCase() !== this.signer.address.toLowerCase()) {
      logger.warn(`⚠️ Aviso: Carteira não é proprietária do contrato. Owner: ${owner}`);
    }
  }

  // ========== ORÁCULO DE GAS DINÂMICO ==========
  async initializeGasOracle() {
    this.gasOracle = {
      getOptimalGasPrice: async (urgency = 'normal') => {
        try {
          const feeData = await this.provider.getFeeData();
          let gasPrice = feeData.gasPrice || this.gasConfig.baseGasPrice;

          // Aplicar multiplicador baseado na urgência
          const multipliers = {
            low: 0.9,
            normal: 1.0,
            high: 1.3,
            urgent: 1.8
          };

          gasPrice = gasPrice * BigInt(Math.floor(multipliers[urgency] * 100)) / 100n;

          // Randomização para evitar padrões
          const randomFactor = 1 + (Math.random() - 0.5) * this.gasConfig.randomizationRange;
          gasPrice = gasPrice * BigInt(Math.floor(randomFactor * 100)) / 100n;

          // Limitar ao máximo configurado
          if (gasPrice > this.gasConfig.maxGasPrice) {
            gasPrice = this.gasConfig.maxGasPrice;
          }

          logger.debug(`💰 Gas price calculado: ${ethers.formatUnits(gasPrice, 'gwei')} gwei (urgência: ${urgency})`);
          
          return {
            gasPrice,
            maxFeePerGas: gasPrice,
            maxPriorityFeePerGas: this.gasConfig.priorityFeePerGas
          };

        } catch (error) {
          logger.error('Erro ao obter gas price:', error);
          return {
            gasPrice: this.gasConfig.baseGasPrice,
            maxFeePerGas: this.gasConfig.baseGasPrice,
            maxPriorityFeePerGas: this.gasConfig.priorityFeePerGas
          };
        }
      }
    };

    logger.info('⛽ Oráculo de gas inicializado');
  }

  // ========== CONEXÕES WEBSOCKET COM RECONEXÃO AUTOMÁTICA ==========
  async setupWebSocketConnections() {
    const wsEndpoints = [
      { name: 'primary', url: process.env.WS_URL_PRIMARY },
      { name: 'backup', url: process.env.WS_URL_BACKUP }
    ].filter(endpoint => endpoint.url);

    for (const endpoint of wsEndpoints) {
      await this.createWebSocketConnection(endpoint.name, endpoint.url);
    }
  }

  async createWebSocketConnection(name, url) {
    try {
      const ws = new WebSocket(url);
      
      ws.on('open', () => {
        logger.info(`🔌 WebSocket ${name} conectado: ${url}`);
        this.reconnectAttempts = 0;
        
        // Configurar subscrições
        this.subscribeToEvents(ws, name);
      });

      ws.on('message', (data) => {
        this.handleWebSocketMessage(name, data);
      });

      ws.on('error', (error) => {
        logger.error(`❌ Erro WebSocket ${name}:`, error);
        this.handleWebSocketReconnection(name, url);
      });

      ws.on('close', () => {
        logger.warn(`🔌 WebSocket ${name} desconectado`);
        this.handleWebSocketReconnection(name, url);
      });

      // Ping para manter conexão viva
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      this.wsConnections.set(name, { ws, pingInterval });

    } catch (error) {
      logger.error(`Erro ao criar WebSocket ${name}:`, error);
      this.handleWebSocketReconnection(name, url);
    }
  }

  async handleWebSocketReconnection(name, url) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`❌ Máximo de tentativas de reconexão atingido para ${name}`);
    return;
  }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Backoff exponencial
    
    logger.info(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} para ${name} em ${delay}ms`);
    
    setTimeout(() => {
      this.createWebSocketConnection(name, url);
    }, delay);
  }

  subscribeToEvents(ws, connectionName) {
    // Subscrever a novos blocos
    const subscribeToBlocks = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: ['newHeads']
    };

    // Subscrever a transações pendentes (mempool)
    const subscribeToMempool = {
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_subscribe',
      params: ['newPendingTransactions']
    };

    ws.send(JSON.stringify(subscribeToBlocks));
    ws.send(JSON.stringify(subscribeToMempool));
    
    logger.debug(`📡 Subscriptions configuradas para ${connectionName}`);
  }

  // ========== PROCESSAMENTO DE MENSAGENS ==========
  handleWebSocketMessage(connectionName, data) {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.method === 'eth_subscription') {
        const params = message.params;
        
        if (params && params.result) {
          if (params.result.number) {
            // Novo bloco
            this.handleNewBlock(params.result);
          } else if (typeof params.result === 'string') {
            // Nova transação pendente
            this.handlePendingTransaction(params.result);
          }
        }
      }
      
    } catch (error) {
      logger.error(`Erro ao processar mensagem WebSocket ${connectionName}:`, error);
    }
  }

  async handleNewBlock(blockData) {
    const blockNumber = parseInt(blockData.number, 16);
    logger.debug(`🆕 Novo bloco: ${blockNumber}`);
    
    // Atualizar gas price periodicamente
    if (Date.now() - this.lastGasUpdate > this.gasUpdateInterval) {
      await this.updateGasEstimates();
      this.lastGasUpdate = Date.now();
    }
    
    // Verificar oportunidades de arbitragem
    await this.scanForArbitrageOpportunities(blockNumber);
  }

  async handlePendingTransaction(txHash) {
    // Analisar transações pendentes para detectar oportunidades
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (tx && this.isRelevantTransaction(tx)) {
        logger.debug(`🔍 Transação relevante detectada: ${txHash}`);
        await this.analyzeCompetingTransaction(tx);
      }
    } catch (error) {
      // Ignorar erros de transações que não existem mais
    }
  }

  // ========== VALIDAÇÃO DE PARÂMETROS ==========
  validateArbitrageParams(params) {
    const errors = [];

    // Validar endereços
    if (!ethers.isAddress(params.tokenA)) {
      errors.push('tokenA deve ser um endereço válido');
    }
    if (!ethers.isAddress(params.tokenB)) {
      errors.push('tokenB deve ser um endereço válido');
    }
    if (!ethers.isAddress(params.dex1Router)) {
      errors.push('dex1Router deve ser um endereço válido');
    }
    if (!ethers.isAddress(params.dex2Router)) {
      errors.push('dex2Router deve ser um endereço válido');
    }

    // Validar quantidades
    if (!params.amount || params.amount <= 0) {
      errors.push('amount deve ser maior que zero');
    }
    if (!params.minAmountOut || params.minAmountOut <= 0) {
      errors.push('minAmountOut deve ser maior que zero');
    }

    // Validar deadline
    if (!params.deadline || params.deadline <= Math.floor(Date.now() / 1000)) {
      errors.push('deadline deve ser no futuro');
    }

    // Validar routers autorizados
    const authorizedRouters = Object.values(this.dexConfig).map(dex => dex.router.toLowerCase());
    if (!authorizedRouters.includes(params.dex1Router.toLowerCase())) {
      errors.push('dex1Router não está autorizado');
    }
    if (!authorizedRouters.includes(params.dex2Router.toLowerCase())) {
      errors.push('dex2Router não está autorizado');
    }

    if (errors.length > 0) {
      throw new Error(`Parâmetros inválidos: ${errors.join(', ')}`);
    }

    return true;
  }

  // ========== EXECUÇÃO DE ARBITRAGEM COM PROTEÇÃO MEV ==========
  async executeArbitrageWithMEVProtection(params) {
    try {
      // Validar parâmetros
      this.validateArbitrageParams(params);

      // Calcular gas otimizado
      const gasEstimate = await this.gasOracle.getOptimalGasPrice('high');
      
      // Preparar transação
      const arbitrageParams = {
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        dex1Router: params.dex1Router,
        dex2Router: params.dex2Router,
        minAmountOut: params.minAmountOut,
        deadline: Math.floor(Date.now() / 1000) + 300 // 5 minutos
      };

      logger.info('🎯 Executando arbitragem:', {
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        amount: ethers.formatEther(params.amount),
        estimatedProfit: ethers.formatEther(params.expectedProfit || 0),
        gasPrice: ethers.formatUnits(gasEstimate.gasPrice, 'gwei') + ' gwei'
      });

      let txHash;

      if (this.mevProtection.enabled && this.mevProtection.privateMempool) {
        // Usar mempool privada ou Flashbots
        txHash = await this.executeViaPrivateMempool(params, arbitrageParams, gasEstimate);
      } else {
        // Execução normal
        txHash = await this.executeDirectTransaction(params, arbitrageParams, gasEstimate);
      }

      // Monitorar transação
      await this.monitorTransaction(txHash, params);

      return txHash;

    } catch (error) {
      logger.error('❌ Erro na execução de arbitragem:', error);
      
      // Log detalhado para auditoria
      await this.logArbitrageAttempt({
        params,
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'failed'
      });

      throw error;
    }
  }

  async executeViaPrivateMempool(params, arbitrageParams, gasEstimate) {
    logger.info('🔒 Executando via mempool privada...');

    // Preparar transação
    const tx = await this.contract.executeArbitrage.populateTransaction(
      params.tokenA,
      params.amount,
      arbitrageParams,
      params.expectedProfit || 0
    );

    tx.gasLimit = await this.contract.executeArbitrage.estimateGas(
      params.tokenA,
      params.amount,
      arbitrageParams,
      params.expectedProfit || 0
    );

    tx.gasPrice = gasEstimate.gasPrice;
    tx.nonce = await this.signer.getNonce();

    // Assinar transação
    const signedTx = await this.signer.signTransaction(tx);

    // Enviar via bundle do Flashbots (simulado - implementar Flashbots SDK real)
    return await this.submitToPrivateMempool(signedTx);
  }

  async executeDirectTransaction(params, arbitrageParams, gasEstimate) {
    const tx = await this.contract.executeArbitrage(
      params.tokenA,
      params.amount,
      arbitrageParams,
      params.expectedProfit || 0,
      {
        gasPrice: gasEstimate.gasPrice,
        gasLimit: 500000 // Limite conservador
      }
    );

    logger.info(`📤 Transação enviada: ${tx.hash}`);
    return tx.hash;
  }

  async submitToPrivateMempool(signedTx) {
    // Implementação simulada - integrar com Flashbots ou Eden Network
    logger.info('📦 Enviando bundle para mempool privada...');
    
    // Por enquanto, enviar transação normal
    const tx = await this.provider.broadcastTransaction(signedTx);
    return tx.hash;
  }

  // ========== MONITORAMENTO E LOGS ==========
  async monitorTransaction(txHash, params) {
    logger.info(`⏳ Monitorando transação: ${txHash}`);
    
    try {
      const receipt = await this.provider.waitForTransaction(txHash, 1, 300000); // 5 minutos timeout
      
      if (receipt.status === 1) {
        logger.info(`✅ Arbitragem executada com sucesso! Hash: ${txHash}`);
        
        // Calcular gas usado e custo
        const gasUsed = receipt.gasUsed;
        const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice;
        const gasCost = gasUsed * gasPrice;
        
        // Log detalhado para análise
        await this.logArbitrageAttempt({
          params,
          txHash,
          gasUsed: gasUsed.toString(),
          gasCost: ethers.formatEther(gasCost),
          blockNumber: receipt.blockNumber,
          timestamp: new Date().toISOString(),
          status: 'success'
        });

  } else {
        logger.error(`❌ Transação falhou: ${txHash}`);
        await this.logArbitrageAttempt({
          params,
          txHash,
          timestamp: new Date().toISOString(),
          status: 'failed',
          reason: 'Transaction reverted'
        });
      }

    } catch (error) {
      logger.error(`⏰ Timeout ou erro no monitoramento: ${error.message}`);
      await this.logArbitrageAttempt({
        params,
        txHash,
        timestamp: new Date().toISOString(),
        status: 'timeout',
        error: error.message
      });
    }
  }

  async logArbitrageAttempt(data) {
    // Log em arquivo JSON estruturado
    const logEntry = {
      ...data,
      botVersion: '2.0.0',
      networkId: await this.provider.getNetwork().then(n => n.chainId)
    };

    // Salvar em arquivo de logs
    const logFile = path.join('logs', `arbitrage-${new Date().toISOString().split('T')[0]}.json`);
    
    let existingLogs = [];
    if (fs.existsSync(logFile)) {
      existingLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    existingLogs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));

    // Log estruturado via Winston
    logger.info('📊 Arbitragem logged:', {
      status: data.status,
      token: data.params?.tokenA,
      profit: data.params?.expectedProfit
    });
  }

  // ========== ANÁLISE DE OPORTUNIDADES ==========
  async scanForArbitrageOpportunities(blockNumber) {
    // Implementar lógica de scan otimizada
    // Esta é uma versão simplificada
    
    const commonTokens = [
      '0xA0b86a33E6441C5C88b9D1F1C9Bb6B4e8e73E1', // Token exemplo
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
      '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'  // DAI
    ];

    for (const token of commonTokens) {
      try {
        await this.checkTokenArbitrageOpportunity(token, blockNumber);
      } catch (error) {
        logger.debug(`Erro ao verificar token ${token}:`, error.message);
      }
    }
  }

  async checkTokenArbitrageOpportunity(tokenAddress, blockNumber) {
    // Lógica de detecção de oportunidades entre DEXs
    // Simplificada para este exemplo
    
    const dexes = Object.values(this.dexConfig);
    
    for (let i = 0; i < dexes.length - 1; i++) {
      for (let j = i + 1; j < dexes.length; j++) {
        const price1 = await this.getTokenPrice(tokenAddress, dexes[i].router);
        const price2 = await this.getTokenPrice(tokenAddress, dexes[j].router);
        
        if (price1 && price2) {
          const spread = Math.abs(price1 - price2) / Math.min(price1, price2);
          
          if (spread > 0.005) { // 0.5% spread mínimo
            logger.info(`🎯 Oportunidade detectada: ${spread.toFixed(4)}% entre ${dexes[i].name} e ${dexes[j].name}`);
            
            // Aqui você implementaria a lógica de execução
            // await this.evaluateAndExecuteArbitrage(tokenAddress, dexes[i], dexes[j], spread);
          }
        }
      }
    }
  }

  // ========== CONTROLE DO BOT ==========
  startMonitoring() {
    this.isRunning = true;
    logger.info('🔄 Monitoramento iniciado');
    
    // Verificação periódica de saúde
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // A cada minuto
  }

  stopMonitoring() {
    this.isRunning = false;
    
    // Fechar conexões WebSocket
    for (const [name, connection] of this.wsConnections) {
      if (connection.pingInterval) {
        clearInterval(connection.pingInterval);
      }
      if (connection.ws) {
        connection.ws.close();
      }
    }
    
    logger.info('⏹️ Monitoramento parado');
  }

  async performHealthCheck() {
    try {
      // Verificar conexão com provider
      const blockNumber = await this.provider.getBlockNumber();
      
      // Verificar saldo da carteira
      const balance = await this.provider.getBalance(this.signer.address);
      const balanceEth = ethers.formatEther(balance);
      
      if (parseFloat(balanceEth) < 0.01) {
        logger.warn(`⚠️ Saldo baixo: ${balanceEth} ETH`);
      }
      
      // Verificar conexões WebSocket
      let activeConnections = 0;
      for (const [name, connection] of this.wsConnections) {
        if (connection.ws.readyState === WebSocket.OPEN) {
          activeConnections++;
        }
      }
      
      logger.debug(`💓 Health check - Bloco: ${blockNumber}, Saldo: ${balanceEth} ETH, WS: ${activeConnections}/${this.wsConnections.size}`);
      
    } catch (error) {
      logger.error('❌ Erro no health check:', error);
    }
  }

  // ========== UTILITÁRIOS ==========
  async getTokenPrice(tokenAddress, routerAddress) {
    // Implementar lógica de consulta de preço
    // Esta é uma versão simplificada
    try {
      // Aqui você implementaria a consulta real de preço via router
      return Math.random() * 1000; // Preço simulado
    } catch (error) {
      return null;
    }
  }

  isRelevantTransaction(tx) {
    // Verificar se a transação é relevante para arbitragem
    const relevantMethods = [
      '0x38ed1739', // swapExactTokensForTokens
      '0x8803dbee', // swapTokensForExactTokens
      '0x7ff36ab5'  // swapExactETHForTokens
    ];
    
    return tx.data && relevantMethods.some(method => tx.data.startsWith(method));
  }

  async analyzeCompetingTransaction(tx) {
    // Analisar transações concorrentes para ajustar estratégia
    logger.debug(`🔍 Analisando transação concorrente: ${tx.hash}`);
  }

  async updateGasEstimates() {
    try {
      const feeData = await this.provider.getFeeData();
      this.gasConfig.baseGasPrice = feeData.gasPrice || this.gasConfig.baseGasPrice;
      logger.debug(`⛽ Gas atualizado: ${ethers.formatUnits(this.gasConfig.baseGasPrice, 'gwei')} gwei`);
    } catch (error) {
      logger.error('Erro ao atualizar gas:', error);
    }
  }
}

// ========== INICIALIZAÇÃO ==========
async function main() {
  try {
    const bot = new AdvancedArbitrageBot();
    await bot.initialize();
    
    // Manipuladores de saída graceful
    process.on('SIGINT', () => {
      logger.info('📴 Recebido SIGINT, parando bot...');
      bot.stopMonitoring();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('📴 Recebido SIGTERM, parando bot...');
      bot.stopMonitoring();
      process.exit(0);
    });

    // Manter processo ativo
    process.on('uncaughtException', (error) => {
      logger.error('💥 Erro não tratado:', error);
      bot.stopMonitoring();
      process.exit(1);
    });

  } catch (error) {
    logger.error('💥 Erro fatal na inicialização:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { AdvancedArbitrageBot };