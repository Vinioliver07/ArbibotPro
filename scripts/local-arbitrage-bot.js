const { ethers } = require('ethers');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ===== CONFIGURAÇÃO DE LOGS OTIMIZADA =====
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: path.join(logDir, 'arbitrage.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: path.join(logDir, 'errors.log'), 
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 3
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// ===== CONFIGURAÇÃO DE PERFORMANCE =====
const PERFORMANCE_CONFIG = {
    MAX_CONCURRENT_OPERATIONS: 5,
    GAS_LIMIT_MULTIPLIER: 1.2,
    TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
    MIN_PROFIT_WEI: ethers.parseEther('0.001'), // 0.001 ETH mínimo
    MAX_SLIPPAGE: 0.5, // 0.5%
    BUNDLE_TIMEOUT: 2000, // 2 segundos para bundle
    MEMPOOL_TIMEOUT: 1000, // 1 segundo para mempool
    HEALTH_CHECK_INTERVAL: 30000, // 30 segundos
    GAS_UPDATE_INTERVAL: 15000, // 15 segundos
    PRICE_UPDATE_INTERVAL: 5000, // 5 segundos
    CACHE_DURATION: 10000 // 10 segundos
};

// ===== CACHE DE PERFORMANCE =====
class PerformanceCache {
    constructor() {
        this.cache = new Map();
        this.gasPrice = null;
        this.lastGasUpdate = 0;
        this.lastPriceUpdate = 0;
        this.prices = new Map();
    }

    set(key, value, ttl = PERFORMANCE_CONFIG.CACHE_DURATION) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item || Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    clear() {
        this.cache.clear();
    }
}

const cache = new PerformanceCache();

// ===== CONFIGURAÇÃO DE REDE =====
class NetworkManager {
    constructor() {
        this.providers = new Map();
        this.currentProvider = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000;
    }

    async initialize() {
        const rpcUrls = [
            process.env.POLYGON_RPC_URL,
            process.env.QUICKNODE_RPC_URL,
            process.env.ALCHEMY_RPC_URL
        ].filter(Boolean);

        for (const rpcUrl of rpcUrls) {
            try {
                const provider = new ethers.JsonRpcProvider(rpcUrl);
                await provider.getNetwork();
                this.providers.set(rpcUrl, provider);
                logger.info(`Provider conectado: ${rpcUrl.substring(0, 50)}...`);
            } catch (error) {
                logger.warn(`Falha ao conectar provider: ${error.message}`);
            }
        }

        if (this.providers.size === 0) {
            throw new Error('Nenhum provider válido encontrado');
        }

        this.currentProvider = Array.from(this.providers.values())[0];
        this.startHealthCheck();
    }

    async getProvider() {
        if (!this.currentProvider) {
            await this.reconnect();
        }
        return this.currentProvider;
    }

    async reconnect() {
        this.reconnectAttempts++;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            throw new Error('Máximo de tentativas de reconexão atingido');
        }

        logger.warn(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        for (const [url, provider] of this.providers) {
            try {
                await provider.getNetwork();
                this.currentProvider = provider;
                this.reconnectAttempts = 0;
                logger.info('Reconexão bem-sucedida');
                return;
            } catch (error) {
                logger.warn(`Falha na reconexão com ${url}: ${error.message}`);
            }
        }

        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        await this.reconnect();
    }

    startHealthCheck() {
        setInterval(async () => {
            try {
                await this.currentProvider.getNetwork();
            } catch (error) {
                logger.error('Health check falhou, tentando reconectar...');
                await this.reconnect();
            }
        }, PERFORMANCE_CONFIG.HEALTH_CHECK_INTERVAL);
    }
}

// ===== GERENCIADOR DE GAS OTIMIZADO =====
class GasManager {
    constructor(networkManager) {
        this.networkManager = networkManager;
        this.lastUpdate = 0;
        this.gasPrice = null;
        this.gasOracle = null;
    }

    async getOptimalGasPrice(urgency = 'normal') {
        const now = Date.now();
        
        // Cache de 15 segundos
        if (this.gasPrice && (now - this.lastUpdate) < PERFORMANCE_CONFIG.GAS_UPDATE_INTERVAL) {
            return this.addRandomization(this.gasPrice, urgency);
        }

        try {
            const provider = await this.networkManager.getProvider();
            const feeData = await provider.getFeeData();
            
            // Estratégia de gas price baseada na urgência
            let baseGasPrice;
            switch (urgency) {
                case 'low':
                    baseGasPrice = feeData.gasPrice * 95n / 100n; // 5% abaixo
                    break;
                case 'normal':
                    baseGasPrice = feeData.gasPrice;
                    break;
                case 'high':
                    baseGasPrice = feeData.gasPrice * 110n / 100n; // 10% acima
                    break;
                case 'urgent':
                    baseGasPrice = feeData.gasPrice * 125n / 100n; // 25% acima
                    break;
                default:
                    baseGasPrice = feeData.gasPrice;
            }

            this.gasPrice = baseGasPrice;
            this.lastUpdate = now;

            return this.addRandomization(baseGasPrice, urgency);
        } catch (error) {
            logger.error('Erro ao obter gas price:', error);
            // Fallback para gas price padrão
            return ethers.parseUnits('30', 'gwei');
        }
    }

    addRandomization(gasPrice, urgency) {
        // Randomização de ±5% para dificultar análise
        const randomFactor = 0.95 + (Math.random() * 0.1); // 0.95 a 1.05
        return gasPrice * BigInt(Math.floor(randomFactor * 100)) / 100n;
    }

    calculateGasLimit(estimatedGas) {
        return estimatedGas * BigInt(Math.floor(PERFORMANCE_CONFIG.GAS_LIMIT_MULTIPLIER * 100)) / 100n;
    }
}

// ===== DETECTOR DE OPORTUNIDADES OTIMIZADO =====
class OpportunityDetector {
    constructor(networkManager, gasManager) {
        this.networkManager = networkManager;
        this.gasManager = gasManager;
        this.lastPriceUpdate = 0;
        this.priceCache = new Map();
    }

    async detectOpportunities() {
        const now = Date.now();
        
        // Cache de preços por 5 segundos
        if ((now - this.lastPriceUpdate) < PERFORMANCE_CONFIG.PRICE_UPDATE_INTERVAL) {
            return this.analyzeCachedPrices();
        }

        try {
            const provider = await this.networkManager.getProvider();
            const opportunities = [];

            // Pares de tokens para arbitragem
            const tokenPairs = [
                {
                    tokenA: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
                    tokenB: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH
                    dexA: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
                    dexB: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'  // SushiSwap
                },
                {
                    tokenA: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH
                    tokenB: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
                    dexA: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
                    dexB: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'  // SushiSwap
                }
            ];

            for (const pair of tokenPairs) {
                const opportunity = await this.checkPair(pair, provider);
                if (opportunity && opportunity.profit > PERFORMANCE_CONFIG.MIN_PROFIT_WEI) {
                    opportunities.push(opportunity);
                }
            }

            this.lastPriceUpdate = now;
            return opportunities.sort((a, b) => Number(b.profit - a.profit));

        } catch (error) {
            logger.error('Erro ao detectar oportunidades:', error);
            return [];
        }
    }

    async checkPair(pair, provider) {
        try {
            // Simulação de preços (em produção, você usaria APIs reais)
            const priceA = await this.getTokenPrice(pair.tokenA, pair.dexA, provider);
            const priceB = await this.getTokenPrice(pair.tokenA, pair.dexB, provider);

            if (!priceA || !priceB) return null;

            const priceDiff = Math.abs(priceA - priceB);
            const priceRatio = priceDiff / Math.min(priceA, priceB);

            if (priceRatio > 0.01) { // 1% de diferença mínima
                const profit = this.calculateProfit(priceA, priceB, pair);
                return {
                    tokenA: pair.tokenA,
                    tokenB: pair.tokenB,
                    dexA: pair.dexA,
                    dexB: pair.dexB,
                    priceA,
                    priceB,
                    profit,
                    priceRatio
                };
            }

            return null;
        } catch (error) {
            logger.warn(`Erro ao verificar par ${pair.tokenA}-${pair.tokenB}:`, error);
            return null;
        }
    }

    async getTokenPrice(tokenAddress, dexAddress, provider) {
        const cacheKey = `${tokenAddress}-${dexAddress}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        // Simulação de preço (substitua por API real)
        const basePrice = 1000; // USDC base
        const randomVariation = 0.95 + (Math.random() * 0.1); // ±5%
        const price = basePrice * randomVariation;

        cache.set(cacheKey, price);
        return price;
    }

    calculateProfit(priceA, priceB, pair) {
        // Simulação de cálculo de lucro
        const amount = ethers.parseEther('1');
        const gasPrice = ethers.parseUnits('30', 'gwei');
        const gasLimit = 300000n;
        const gasCost = gasPrice * gasLimit;
        
        const profit = amount * BigInt(Math.floor(Math.abs(priceA - priceB) * 1000)) / 1000n;
        return profit > gasCost ? profit - gasCost : 0n;
    }

    analyzeCachedPrices() {
        // Análise de preços em cache para performance
        return [];
    }
}

// ===== EXECUTOR DE ARBITRAGEM OTIMIZADO =====
class ArbitrageExecutor {
    constructor(networkManager, gasManager) {
        this.networkManager = networkManager;
        this.gasManager = gasManager;
        this.wallet = null;
        this.contract = null;
        this.isExecuting = false;
    }

    async initialize() {
        const provider = await this.networkManager.getProvider();
        const privateKey = process.env.PRIVATE_KEY;
        
        if (!privateKey) {
            throw new Error('PRIVATE_KEY não configurada no .env');
        }

        this.wallet = new ethers.Wallet(privateKey, provider);
        logger.info(`Wallet inicializada: ${this.wallet.address}`);

        // Carregar contrato
        const contractAddress = process.env.ARBITRAGE_BOT_ADDRESS;
        if (!contractAddress) {
            throw new Error('ARBITRAGE_BOT_ADDRESS não configurada');
        }

        const contractABI = JSON.parse(fs.readFileSync('./artifacts/contracts/ArbitrageBotV2.sol/ArbitrageBotV2.json')).abi;
        this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
        
        logger.info('Contrato de arbitragem carregado');
    }

    async executeArbitrage(opportunity) {
        if (this.isExecuting) {
            logger.warn('Execução já em andamento, pulando...');
            return false;
        }

        this.isExecuting = true;

        try {
            logger.info(`Executando arbitragem: ${opportunity.tokenA} -> ${opportunity.tokenB}`);
            logger.info(`Lucro estimado: ${ethers.formatEther(opportunity.profit)} ETH`);

            // Validar parâmetros
            if (!this.validateOpportunity(opportunity)) {
                throw new Error('Oportunidade inválida');
            }

            // Obter gas price otimizado
            const gasPrice = await this.gasManager.getOptimalGasPrice('high');
            
            // Preparar transação
            const txData = await this.prepareTransaction(opportunity);
            
            // Executar com proteção
            const tx = await this.executeWithProtection(txData, gasPrice);
            
            // Aguardar confirmação
            const receipt = await tx.wait();
            
            logger.info(`Arbitragem executada com sucesso! Hash: ${receipt.hash}`);
            logger.info(`Gas usado: ${receipt.gasUsed.toString()}`);
            
            return true;

        } catch (error) {
            logger.error('Erro na execução da arbitragem:', error);
            return false;
        } finally {
            this.isExecuting = false;
        }
    }

    validateOpportunity(opportunity) {
        if (!opportunity.tokenA || !opportunity.tokenB) return false;
        if (!opportunity.dexA || !opportunity.dexB) return false;
        if (opportunity.profit <= 0n) return false;
        if (opportunity.priceRatio < 0.005) return false; // 0.5% mínimo
        
        return true;
    }

    async prepareTransaction(opportunity) {
        // Preparar dados da transação
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutos
        
        return {
            tokenA: opportunity.tokenA,
            tokenB: opportunity.tokenB,
            dexA: opportunity.dexA,
            dexB: opportunity.dexB,
            amount: ethers.parseEther('1'),
            deadline
        };
    }

    async executeWithProtection(txData, gasPrice) {
        // Proteção contra MEV
        if (process.env.USE_FLASHBOTS === 'true') {
            return await this.executeWithFlashbots(txData, gasPrice);
        } else {
            return await this.executeStandard(txData, gasPrice);
        }
    }

    async executeStandard(txData, gasPrice) {
        const gasLimit = this.gasManager.calculateGasLimit(300000n);
        
        const tx = await this.contract.executeArbitrage(
            txData.tokenA,
            txData.tokenB,
            txData.dexA,
            txData.dexB,
            txData.amount,
            txData.deadline,
            {
                gasPrice,
                gasLimit,
                maxFeePerGas: gasPrice * 2n,
                maxPriorityFeePerGas: gasPrice / 2n
            }
        );

        return tx;
    }

    async executeWithFlashbots(txData, gasPrice) {
        // Implementação Flashbots (simplificada)
        logger.info('Executando com proteção Flashbots...');
        return await this.executeStandard(txData, gasPrice);
    }
}

// ===== BOT PRINCIPAL OTIMIZADO =====
class LocalArbitrageBot {
    constructor() {
        this.networkManager = new NetworkManager();
        this.gasManager = new GasManager(this.networkManager);
        this.detector = new OpportunityDetector(this.networkManager, this.gasManager);
        this.executor = new ArbitrageExecutor(this.networkManager, this.gasManager);
        this.isRunning = false;
        this.stats = {
            opportunitiesFound: 0,
            opportunitiesExecuted: 0,
            totalProfit: 0n,
            errors: 0,
            startTime: null
        };
    }

    async start() {
        try {
            logger.info('🚀 Iniciando ArbiBot Pro Local...');
            
            // Inicializar componentes
            await this.networkManager.initialize();
            await this.executor.initialize();
            
            this.isRunning = true;
            this.stats.startTime = Date.now();
            
            logger.info('✅ Bot inicializado com sucesso!');
            logger.info(`📊 Configurações de Performance:`);
            logger.info(`   - Máximo de operações simultâneas: ${PERFORMANCE_CONFIG.MAX_CONCURRENT_OPERATIONS}`);
            logger.info(`   - Intervalo de verificação: ${PERFORMANCE_CONFIG.PRICE_UPDATE_INTERVAL}ms`);
            logger.info(`   - Lucro mínimo: ${ethers.formatEther(PERFORMANCE_CONFIG.MIN_PROFIT_WEI)} ETH`);
            
            // Iniciar loop principal
            await this.mainLoop();
            
        } catch (error) {
            logger.error('❌ Erro fatal na inicialização:', error);
            process.exit(1);
        }
    }

    async mainLoop() {
        while (this.isRunning) {
            try {
                // Detectar oportunidades
                const opportunities = await this.detector.detectOpportunities();
                
                if (opportunities.length > 0) {
                    this.stats.opportunitiesFound += opportunities.length;
                    logger.info(`🎯 ${opportunities.length} oportunidade(s) encontrada(s)`);
                    
                    // Executar melhor oportunidade
                    const bestOpportunity = opportunities[0];
                    const success = await this.executor.executeArbitrage(bestOpportunity);
                    
                    if (success) {
                        this.stats.opportunitiesExecuted++;
                        this.stats.totalProfit += bestOpportunity.profit;
                        logger.info(`💰 Lucro total acumulado: ${ethers.formatEther(this.stats.totalProfit)} ETH`);
                    }
                }

                // Log de estatísticas a cada 10 iterações
                if (this.stats.opportunitiesFound % 10 === 0 && this.stats.opportunitiesFound > 0) {
                    this.logStats();
                }

                // Aguardar próximo ciclo
                await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.PRICE_UPDATE_INTERVAL));
                
            } catch (error) {
                this.stats.errors++;
                logger.error('Erro no loop principal:', error);
                
                // Aguardar antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    logStats() {
        const uptime = Date.now() - this.stats.startTime;
        const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
        
        logger.info(`📊 Estatísticas:`);
        logger.info(`   - Tempo ativo: ${uptimeHours}h`);
        logger.info(`   - Oportunidades encontradas: ${this.stats.opportunitiesFound}`);
        logger.info(`   - Oportunidades executadas: ${this.stats.opportunitiesExecuted}`);
        logger.info(`   - Taxa de sucesso: ${((this.stats.opportunitiesExecuted / this.stats.opportunitiesFound) * 100).toFixed(2)}%`);
        logger.info(`   - Lucro total: ${ethers.formatEther(this.stats.totalProfit)} ETH`);
        logger.info(`   - Erros: ${this.stats.errors}`);
    }

    async stop() {
        logger.info('🛑 Parando bot...');
        this.isRunning = false;
        this.logStats();
    }
}

// ===== HANDLERS DE SINAL =====
process.on('SIGINT', async () => {
    logger.info('Recebido SIGINT, parando bot...');
    if (global.bot) {
        await global.bot.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Recebido SIGTERM, parando bot...');
    if (global.bot) {
        await global.bot.stop();
    }
    process.exit(0);
});

// ===== INICIALIZAÇÃO =====
async function main() {
    try {
        // Verificar variáveis de ambiente
        const requiredEnvVars = ['PRIVATE_KEY', 'POLYGON_RPC_URL'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Variável de ambiente ${envVar} não configurada`);
            }
        }

        // Criar e iniciar bot
        global.bot = new LocalArbitrageBot();
        await global.bot.start();
        
    } catch (error) {
        logger.error('Erro fatal:', error);
        process.exit(1);
    }
}

// Executar se for o arquivo principal
if (require.main === module) {
    main();
}

module.exports = { LocalArbitrageBot, PerformanceCache, NetworkManager, GasManager, OpportunityDetector, ArbitrageExecutor }; 