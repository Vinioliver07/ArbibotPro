const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configurações
const CONFIG = {
  // Rede e Contrato
  RPC_URL: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
  CONTRACT_ADDRESS: process.env.AMOY_ARBITRAGE_BOT_ADDRESS,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  
  // Parâmetros de Execução
  MIN_PROFIT_ETH: parseFloat(process.env.MIN_PROFIT_ETH || "0.001"),
  CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL || "5000"),
  MAX_GAS_PRICE: parseInt(process.env.MAX_GAS_PRICE || "100"),
  MAX_SLIPPAGE: parseFloat(process.env.MAX_SLIPPAGE || "0.5"),
  
  // Configurações de Log
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_TO_FILE: process.env.LOG_TO_FILE === "true",
  LOG_TO_CONSOLE: process.env.LOG_TO_CONSOLE !== "false",
  
  // Timeouts
  RPC_TIMEOUT: parseInt(process.env.RPC_TIMEOUT || "10000"),
  MAX_RECONNECT_ATTEMPTS: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || "10"),
  
  // Configurações de Performance
  GAS_LIMIT_MULTIPLIER: parseFloat(process.env.GAS_LIMIT_MULTIPLIER || "1.2"),
  GAS_PRICE_MULTIPLIER: parseFloat(process.env.GAS_PRICE_MULTIPLIER || "1.1"),
  
  // Configurações de Cache
  CACHE_DURATION: parseInt(process.env.CACHE_DURATION || "10000"),
  PRICE_CACHE_DURATION: parseInt(process.env.PRICE_CACHE_DURATION || "5000"),
  GAS_CACHE_DURATION: parseInt(process.env.GAS_CACHE_DURATION || "15000"),
  
  // Configurações de Retry
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS || "3"),
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY || "1000"),
  
  // Configurações de Monitoramento
  MONITORING_ENABLED: process.env.MONITORING_ENABLED !== "false",
  METRICS_ENABLED: process.env.METRICS_ENABLED !== "false",
  
  // Configurações de Backup
  BACKUP_ENABLED: process.env.BACKUP_ENABLED !== "false",
  BACKUP_INTERVAL: parseInt(process.env.BACKUP_INTERVAL || "3600000"),
  
  // Configurações de Alertas
  ALERTS_ENABLED: process.env.ALERTS_ENABLED === "true",
  ALERT_WEBHOOK: process.env.ALERT_WEBHOOK,
  
  // Configurações de Desenvolvimento
  NODE_ENV: process.env.NODE_ENV || "production",
  DEBUG: process.env.DEBUG === "true"
};

// Endereços da Polygon Amoy
const AMOY_ADDRESSES = {
  // Tokens
  WMATIC: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
  USDC: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
  USDT: "0xc2c527c0cacf457746bd31b2a698fe89de2b6d49",
  WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  
  // DEX Routers
  QUICKSWAP_V2_ROUTER: "0x8954AfA98594b838bda56FE4C12a09D7739D179b",
  
  // Pairs para monitoramento
  PAIRS: [
    {
      name: "WMATIC/USDC",
      tokenA: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
      tokenB: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
      decimalsA: 18,
      decimalsB: 6
    },
    {
      name: "WMATIC/USDT",
      tokenA: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
      tokenB: "0xc2c527c0cacf457746bd31b2a698fe89de2b6d49",
      decimalsA: 18,
      decimalsB: 6
    },
    {
      name: "WETH/WMATIC",
      tokenA: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      tokenB: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
      decimalsA: 18,
      decimalsB: 18
    }
  ]
};

// ABI do contrato ArbitrageBotV2
const ARBITRAGE_BOT_ABI = [
  "function executeArbitrage(address asset, uint256 amount, tuple(address tokenA, address tokenB, address dex1Router, address dex2Router, uint256 minAmountOut, uint256 deadline, uint256 maxGasPrice, bytes32 salt) params, uint256 expectedProfit) external",
  "function authorizeRouter(address router, bool authorized) external",
  "function authorizeCaller(address caller, bool authorized) external",
  "function setSupportedToken(address token, bool supported) external",
  "function updateConfig(uint256 _minProfitBasisPoints, uint256 _maxSlippageBasisPoints, uint256 _maxGasPrice) external",
  "function getArbitrageStats() external view returns (uint256 successfulArbitrages, uint256 totalProfit, uint256 currentMinProfit, uint256 currentMaxSlippage)",
  "function isRouterAuthorized(address router) external view returns (bool)",
  "function isCallerAuthorized(address caller) external view returns (bool)",
  "function estimateGasCost(uint256 gasPrice) external pure returns (uint256)",
  "function depositForArbitrage(address token, uint256 amount) external",
  "function withdrawProfits(address token, address recipient) external",
  "function withdrawETH(address payable recipient) external",
  "function emergencyPause() external",
  "function emergencyUnpause() external",
  "event ArbitrageExecuted(address indexed asset, uint256 indexed amount, uint256 profit, address indexed dex1, address dex2, uint256 gasUsed, uint256 timestamp, bytes32 arbitrageId)",
  "event ArbitrageFailed(address indexed asset, uint256 indexed amount, string indexed reason, address dex1, address dex2, uint256 timestamp, bytes32 arbitrageId)"
];

// ABI do Router Uniswap V2
const ROUTER_ABI = [
  "function getAmountsOut(uint256 amountIn, address[] memory path) external view returns (uint256[] memory amounts)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)"
];

// ABI do Token ERC20
const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string memory)"
];

// Classe de Logger
class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, "..", "logs");
    this.ensureLogsDirectory();
    
    this.logFile = path.join(this.logsDir, "arbitrage.log");
    this.errorFile = path.join(this.logsDir, "errors.log");
  }
  
  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }
  
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    const logString = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ` | ${JSON.stringify(data)}` : ""}`;
    
    if (CONFIG.LOG_TO_CONSOLE) {
      console.log(logString);
    }
    
    if (CONFIG.LOG_TO_FILE) {
      fs.appendFileSync(this.logFile, logString + "\n");
      
      if (level === "error") {
        fs.appendFileSync(this.errorFile, logString + "\n");
      }
    }
  }
  
  info(message, data = null) {
    this.log("info", message, data);
  }
  
  warn(message, data = null) {
    this.log("warn", message, data);
  }
  
  error(message, data = null) {
    this.log("error", message, data);
  }
  
  debug(message, data = null) {
    if (CONFIG.DEBUG) {
      this.log("debug", message, data);
    }
  }
}

// Classe de Cache
class Cache {
  constructor() {
    this.cache = new Map();
  }
  
  set(key, value, ttl = CONFIG.CACHE_DURATION) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// Classe de Gerenciamento de Rede
class NetworkManager {
  constructor(logger) {
    this.logger = logger;
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.reconnectAttempts = 0;
    this.isConnected = false;
  }
  
  async initialize() {
    try {
      this.logger.info("🔌 Inicializando conexão com a rede...");
      
      // Criar provider
      this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL, {
        timeout: CONFIG.RPC_TIMEOUT
      });
      
      // Verificar conexão
      await this.provider.getNetwork();
      this.logger.info("✅ Conexão com a rede estabelecida");
      
      // Criar wallet
      this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
      this.logger.info(`👤 Wallet conectada: ${this.wallet.address}`);
      
      // Conectar ao contrato
      this.contract = new ethers.Contract(
        CONFIG.CONTRACT_ADDRESS,
        ARBITRAGE_BOT_ABI,
        this.wallet
      );
      
      // Verificar se o contrato existe
      const code = await this.provider.getCode(CONFIG.CONTRACT_ADDRESS);
      if (code === "0x") {
        throw new Error("Contrato não encontrado no endereço especificado");
      }
      
      this.logger.info("✅ Contrato conectado com sucesso");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      return true;
      
    } catch (error) {
      this.logger.error("❌ Erro ao inicializar conexão", { error: error.message });
      return false;
    }
  }
  
  async reconnect() {
    if (this.reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error("❌ Máximo de tentativas de reconexão atingido");
      return false;
    }
    
    this.reconnectAttempts++;
    this.logger.warn(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS}`);
    
    this.isConnected = false;
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await this.initialize();
  }
  
  async getBalance() {
    try {
      return await this.provider.getBalance(this.wallet.address);
    } catch (error) {
      this.logger.error("Erro ao obter saldo", { error: error.message });
      return ethers.parseEther("0");
    }
  }
  
  async getGasPrice() {
    try {
      return await this.provider.getFeeData();
    } catch (error) {
      this.logger.error("Erro ao obter gas price", { error: error.message });
      return { gasPrice: ethers.parseUnits("50", "gwei") };
    }
  }
}

// Classe de Detecção de Oportunidades
class OpportunityDetector {
  constructor(networkManager, logger, cache) {
    this.networkManager = networkManager;
    this.logger = logger;
    this.cache = cache;
    this.router = new ethers.Contract(
      AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER,
      ROUTER_ABI,
      this.networkManager.provider
    );
  }
  
  async detectOpportunities() {
    const opportunities = [];
    
    for (const pair of AMOY_ADDRESSES.PAIRS) {
      try {
        const opportunity = await this.checkPair(pair);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      } catch (error) {
        this.logger.error(`Erro ao verificar par ${pair.name}`, { error: error.message });
      }
    }
    
    return opportunities;
  }
  
  async checkPair(pair) {
    const cacheKey = `price_${pair.name}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    try {
      // Simular preços em diferentes DEXs (na Amoy usamos apenas QuickSwap)
      const amountIn = ethers.parseUnits("1", pair.decimalsA);
      
      // Preço na DEX1 (QuickSwap)
      const path1 = [pair.tokenA, pair.tokenB];
      const amounts1 = await this.router.getAmountsOut(amountIn, path1);
      const price1 = amounts1[1];
      
      // Simular preço ligeiramente diferente na DEX2 (mesmo QuickSwap com slippage)
      const price2 = price1 * (1 + (Math.random() - 0.5) * 0.02); // ±1% variação
      
      // Calcular spread
      const spread = Math.abs(price2 - price1) / price1 * 100;
      
      // Calcular lucro potencial
      const profit = this.calculateProfit(price1, price2, amountIn, pair);
      
      const opportunity = {
        pair: pair.name,
        tokenA: pair.tokenA,
        tokenB: pair.tokenB,
        dex1: "QuickSwap",
        dex2: "QuickSwap",
        price1: ethers.formatUnits(price1, pair.decimalsB),
        price2: ethers.formatUnits(price2, pair.decimalsB),
        spread: spread,
        profit: profit,
        amountIn: ethers.formatUnits(amountIn, pair.decimalsA),
        timestamp: Date.now()
      };
      
      // Cache por 5 segundos
      this.cache.set(cacheKey, opportunity, CONFIG.PRICE_CACHE_DURATION);
      
      return opportunity;
      
    } catch (error) {
      this.logger.error(`Erro ao verificar par ${pair.name}`, { error: error.message });
      return null;
    }
  }
  
  calculateProfit(price1, price2, amountIn, pair) {
    // Simulação simplificada de lucro
    const spread = Math.abs(price2 - price1) / price1;
    const grossProfit = amountIn * spread;
    
    // Deduzir taxas estimadas
    const gasCost = ethers.parseEther("0.001"); // Estimativa de gas
    const dexFees = grossProfit * 0.003; // 0.3% taxa DEX
    
    const netProfit = grossProfit - gasCost - dexFees;
    
    return netProfit > 0 ? ethers.formatEther(netProfit) : 0;
  }
}

// Classe de Executor de Arbitragem
class ArbitrageExecutor {
  constructor(networkManager, logger) {
    this.networkManager = networkManager;
    this.logger = logger;
    this.executionCount = 0;
    this.successCount = 0;
    this.totalProfit = ethers.parseEther("0");
  }
  
  async executeArbitrage(opportunity) {
    if (!this.networkManager.isConnected) {
      this.logger.error("❌ Rede não conectada");
      return false;
    }
    
    try {
      this.executionCount++;
      this.logger.info(`🚀 Executando arbitragem #${this.executionCount}`, {
        pair: opportunity.pair,
        spread: `${opportunity.spread.toFixed(2)}%`,
        profit: `${opportunity.profit} ETH`
      });
      
      // Validar oportunidade
      if (!this.validateOpportunity(opportunity)) {
        this.logger.warn("⚠️ Oportunidade inválida, pulando...");
        return false;
      }
      
      // Preparar parâmetros da transação
      const params = await this.prepareTransactionParams(opportunity);
      
      // Executar arbitragem
      const tx = await this.networkManager.contract.executeArbitrage(
        opportunity.tokenA,
        ethers.parseUnits(opportunity.amountIn, 18),
        params,
        ethers.parseEther(opportunity.profit.toString())
      );
      
      this.logger.info("📝 Transação enviada", { hash: tx.hash });
      
      // Aguardar confirmação
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        this.successCount++;
        this.logger.info("✅ Arbitragem executada com sucesso!", {
          hash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          successRate: `${((this.successCount / this.executionCount) * 100).toFixed(1)}%`
        });
        
        // Atualizar estatísticas
        await this.updateStats();
        
        return true;
      } else {
        this.logger.error("❌ Transação falhou", { hash: tx.hash });
        return false;
      }
      
    } catch (error) {
      this.logger.error("❌ Erro ao executar arbitragem", { error: error.message });
      return false;
    }
  }
  
  validateOpportunity(opportunity) {
    // Verificar spread mínimo
    if (opportunity.spread < CONFIG.MAX_SLIPPAGE) {
      return false;
    }
    
    // Verificar lucro mínimo
    const profitEth = parseFloat(opportunity.profit);
    if (profitEth < CONFIG.MIN_PROFIT_ETH) {
      return false;
    }
    
    // Verificar se não é muito antiga
    const age = Date.now() - opportunity.timestamp;
    if (age > 30000) { // 30 segundos
      return false;
    }
    
    return true;
  }
  
  async prepareTransactionParams(opportunity) {
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutos
    const gasPrice = await this.getOptimalGasPrice();
    
    // Calcular amountOutMin com slippage
    const amountIn = ethers.parseUnits(opportunity.amountIn, 18);
    const path = [opportunity.tokenA, opportunity.tokenB];
    const amounts = await this.networkManager.router.getAmountsOut(amountIn, path);
    const amountOutMin = amounts[1] * (100 - CONFIG.MAX_SLIPPAGE) / 100;
    
    return {
      tokenA: opportunity.tokenA,
      tokenB: opportunity.tokenB,
      dex1Router: AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER,
      dex2Router: AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER,
      minAmountOut: amountOutMin,
      deadline: deadline,
      maxGasPrice: gasPrice,
      salt: ethers.randomBytes(32)
    };
  }
  
  async getOptimalGasPrice() {
    try {
      const feeData = await this.networkManager.getGasPrice();
      let gasPrice = feeData.gasPrice;
      
      // Aplicar multiplicador
      gasPrice = gasPrice * BigInt(Math.floor(CONFIG.GAS_PRICE_MULTIPLIER * 100)) / 100n;
      
      // Verificar limite máximo
      const maxGasPrice = ethers.parseUnits(CONFIG.MAX_GAS_PRICE.toString(), "gwei");
      if (gasPrice > maxGasPrice) {
        gasPrice = maxGasPrice;
      }
      
      return gasPrice;
      
    } catch (error) {
      this.logger.error("Erro ao calcular gas price", { error: error.message });
      return ethers.parseUnits("50", "gwei");
    }
  }
  
  async updateStats() {
    try {
      const stats = await this.networkManager.contract.getArbitrageStats();
      this.totalProfit = stats.totalProfit;
      
      this.logger.info("📊 Estatísticas atualizadas", {
        successfulArbitrages: stats.successfulArbitrages.toString(),
        totalProfit: ethers.formatEther(stats.totalProfit),
        minProfit: stats.currentMinProfit.toString(),
        maxSlippage: stats.currentMaxSlippage.toString()
      });
      
    } catch (error) {
      this.logger.error("Erro ao atualizar estatísticas", { error: error.message });
    }
  }
}

// Classe Principal do Bot
class ArbitrageBot {
  constructor() {
    this.logger = new Logger();
    this.cache = new Cache();
    this.networkManager = new NetworkManager(this.logger);
    this.opportunityDetector = new OpportunityDetector(this.networkManager, this.logger, this.cache);
    this.executor = new ArbitrageExecutor(this.networkManager, this.logger);
    
    this.isRunning = false;
    this.stats = {
      startTime: null,
      opportunitiesFound: 0,
      opportunitiesExecuted: 0,
      totalProfit: 0
    };
  }
  
  async start() {
    this.logger.info("🤖 Iniciando ArbiBot Pro...");
    
    // Verificar configurações
    if (!this.validateConfig()) {
      this.logger.error("❌ Configuração inválida");
      return false;
    }
    
    // Inicializar conexão
    if (!await this.networkManager.initialize()) {
      this.logger.error("❌ Falha ao conectar com a rede");
      return false;
    }
    
    // Verificar autorizações
    if (!await this.checkAuthorizations()) {
      this.logger.error("❌ Falha nas autorizações");
      return false;
    }
    
    // Iniciar monitoramento
    this.isRunning = true;
    this.stats.startTime = Date.now();
    
    this.logger.info("✅ Bot iniciado com sucesso!");
    this.logger.info("📊 Configurações:", {
      minProfit: `${CONFIG.MIN_PROFIT_ETH} ETH`,
      maxGasPrice: `${CONFIG.MAX_GAS_PRICE} gwei`,
      checkInterval: `${CONFIG.CHECK_INTERVAL}ms`,
      maxSlippage: `${CONFIG.MAX_SLIPPAGE}%`
    });
    
    // Iniciar loop principal
    await this.mainLoop();
    
    return true;
  }
  
  validateConfig() {
    if (!CONFIG.PRIVATE_KEY) {
      this.logger.error("Chave privada não configurada");
      return false;
    }
    
    if (!CONFIG.CONTRACT_ADDRESS) {
      this.logger.error("Endereço do contrato não configurado");
      return false;
    }
    
    if (!CONFIG.RPC_URL) {
      this.logger.error("URL do RPC não configurada");
      return false;
    }
    
    return true;
  }
  
  async checkAuthorizations() {
    try {
      const walletAddress = this.networkManager.wallet.address;
      
      // Verificar se a wallet é caller autorizado
      const isCallerAuthorized = await this.networkManager.contract.isCallerAuthorized(walletAddress);
      if (!isCallerAuthorized) {
        this.logger.warn("⚠️ Wallet não é caller autorizado, tentando autorizar...");
        
        // Tentar autorizar (apenas se for owner)
        try {
          await this.networkManager.contract.authorizeCaller(walletAddress, true);
          this.logger.info("✅ Caller autorizado com sucesso");
        } catch (error) {
          this.logger.error("❌ Falha ao autorizar caller", { error: error.message });
          return false;
        }
      }
      
      // Verificar se o router está autorizado
      const isRouterAuthorized = await this.networkManager.contract.isRouterAuthorized(AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER);
      if (!isRouterAuthorized) {
        this.logger.warn("⚠️ Router não autorizado, tentando autorizar...");
        
        try {
          await this.networkManager.contract.authorizeRouter(AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER, true);
          this.logger.info("✅ Router autorizado com sucesso");
        } catch (error) {
          this.logger.error("❌ Falha ao autorizar router", { error: error.message });
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      this.logger.error("Erro ao verificar autorizações", { error: error.message });
      return false;
    }
  }
  
  async mainLoop() {
    this.logger.info("🔄 Iniciando loop de monitoramento...");
    
    while (this.isRunning) {
      try {
        // Verificar conexão
        if (!this.networkManager.isConnected) {
          this.logger.warn("🔄 Reconectando...");
          if (!await this.networkManager.reconnect()) {
            this.logger.error("❌ Falha na reconexão, aguardando...");
            await this.sleep(10000);
            continue;
          }
        }
        
        // Detectar oportunidades
        const opportunities = await this.opportunityDetector.detectOpportunities();
        
        // Processar oportunidades
        for (const opportunity of opportunities) {
          this.stats.opportunitiesFound++;
          
          if (opportunity.spread > CONFIG.MAX_SLIPPAGE && parseFloat(opportunity.profit) > CONFIG.MIN_PROFIT_ETH) {
            this.logger.info("🎯 Oportunidade encontrada!", {
              pair: opportunity.pair,
              spread: `${opportunity.spread.toFixed(2)}%`,
              profit: `${opportunity.profit} ETH`
            });
            
            const success = await this.executor.executeArbitrage(opportunity);
            if (success) {
              this.stats.opportunitiesExecuted++;
            }
          }
        }
        
        // Log de estatísticas
        if (this.stats.opportunitiesFound % 10 === 0) {
          await this.logStats();
        }
        
        // Aguardar próximo ciclo
        await this.sleep(CONFIG.CHECK_INTERVAL);
        
      } catch (error) {
        this.logger.error("❌ Erro no loop principal", { error: error.message });
        await this.sleep(5000);
      }
    }
  }
  
  async logStats() {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    this.logger.info("📊 Estatísticas do Bot", {
      uptime: `${uptimeHours}h`,
      opportunitiesFound: this.stats.opportunitiesFound,
      opportunitiesExecuted: this.stats.opportunitiesExecuted,
      successRate: this.stats.opportunitiesFound > 0 ? 
        `${((this.stats.opportunitiesExecuted / this.stats.opportunitiesFound) * 100).toFixed(1)}%` : "0%",
      cacheSize: this.cache.size(),
      balance: ethers.formatEther(await this.networkManager.getBalance())
    });
  }
  
  async stop() {
    this.logger.info("🛑 Parando bot...");
    this.isRunning = false;
    
    // Log final
    await this.logStats();
    
    this.logger.info("✅ Bot parado");
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Função principal
async function main() {
  const bot = new ArbitrageBot();
  
  // Capturar sinais de parada
  process.on("SIGINT", async () => {
    console.log("\n🛑 Recebido sinal de parada...");
    await bot.stop();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    console.log("\n🛑 Recebido sinal de término...");
    await bot.stop();
    process.exit(0);
  });
  
  try {
    await bot.start();
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { ArbitrageBot, CONFIG, AMOY_ADDRESSES };
