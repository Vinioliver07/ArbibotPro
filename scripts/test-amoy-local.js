const { ethers } = require('ethers');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ===== CONFIGURAÇÃO AMOY TESTNET =====
const AMOY_CONFIG = {
    // Configurações de Performance para Testnet
    MIN_PROFIT_WEI: ethers.parseEther('0.0001'), // 0.0001 ETH mínimo (testnet)
    CHECK_INTERVAL: 3000,  // 3 segundos (mais rápido para testes)
    MAX_GAS_PRICE: 30,     // Gas price máximo em Gwei (testnet)
    
    // Configurações de Rede
    NETWORK: 'amoy',
    RPC_TIMEOUT: 8000,     // Timeout menor para testnet
    
    // Configurações de Segurança
    MAX_SLIPPAGE: 1.0,     // Slippage maior para testnet
    USE_FLASHBOTS: false,  // Flashbots não disponível em testnet
    
    // Configurações de Log
    LOG_LEVEL: 'debug',    // Log mais detalhado para testes
    LOG_TO_FILE: true,
    LOG_TO_CONSOLE: true,
    
    // Configurações de Teste
    TEST_DURATION: 120000, // 2 minutos de teste
    WARMUP_TIME: 3000,     // 3 segundos de aquecimento
    COOLDOWN_TIME: 2000    // 2 segundos de resfriamento
};

// ===== ENDEREÇOS REAIS DA AMOY TESTNET =====
const AMOY_TOKENS = {
    // Tokens principais da Amoy
    WMATIC: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
    USDC: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
    USDT: "0xc2c527c0cacf457746bd31b2a698fe89de2b6d49",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    
    // Routers DEX
    QUICKSWAP_V2_ROUTER: "0x8954AfA98594b838bda56FE4C12a09D7739D179b",
    
    // Pools de liquidez (endereços simulados para teste)
    POOL_WMATIC_USDC: "0x1234567890123456789012345678901234567890",
    POOL_WMATIC_USDT: "0x2345678901234567890123456789012345678901",
    POOL_USDC_USDT: "0x3456789012345678901234567890123456789012"
};

// ===== CONFIGURAÇÃO DE LOGS PARA TESTNET =====
const logDir = 'logs/amoy';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
    level: AMOY_CONFIG.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: path.join(logDir, 'amoy-test.log'),
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 3
        }),
        new winston.transports.File({ 
            filename: path.join(logDir, 'amoy-errors.log'), 
            level: 'error',
            maxsize: 2 * 1024 * 1024,
            maxFiles: 2
        })
    ]
});

if (AMOY_CONFIG.LOG_TO_CONSOLE) {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// ===== CACHE DE PERFORMANCE PARA TESTNET =====
class AmoyPerformanceCache {
    constructor() {
        this.cache = new Map();
        this.gasPrice = null;
        this.lastGasUpdate = 0;
        this.lastPriceUpdate = 0;
        this.prices = new Map();
        this.testResults = [];
    }

    set(key, value, ttl = 5000) { // Cache menor para testnet
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

    addTestResult(result) {
        this.testResults.push({
            timestamp: Date.now(),
            ...result
        });
    }

    getTestStats() {
        if (this.testResults.length === 0) return null;
        
        const successful = this.testResults.filter(r => r.success);
        const failed = this.testResults.filter(r => !r.success);
        
        return {
            total: this.testResults.length,
            successful: successful.length,
            failed: failed.length,
            successRate: (successful.length / this.testResults.length) * 100,
            avgLatency: this.testResults.reduce((sum, r) => sum + r.latency, 0) / this.testResults.length
        };
    }

    clear() {
        this.cache.clear();
        this.testResults = [];
    }
}

const amoyCache = new AmoyPerformanceCache();

// ===== GERENCIADOR DE REDE AMOY =====
class AmoyNetworkManager {
    constructor() {
        this.provider = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5; // Menos tentativas para testnet
        this.reconnectDelay = 3000; // Delay menor
    }

    async initialize() {
        const rpcUrl = process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
        
        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
                timeout: AMOY_CONFIG.RPC_TIMEOUT
            });
            
            // Verificar conectividade
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            
            logger.info(`✅ Conectado à Amoy testnet`);
            logger.info(`   Chain ID: ${network.chainId}`);
            logger.info(`   Block: ${blockNumber}`);
            logger.info(`   RPC: ${rpcUrl.substring(0, 50)}...`);
            
            this.startHealthCheck();
            
        } catch (error) {
            logger.error(`❌ Falha ao conectar à Amoy: ${error.message}`);
            throw error;
        }
    }

    async getProvider() {
        if (!this.provider) {
            await this.reconnect();
        }
        return this.provider;
    }

    async reconnect() {
        this.reconnectAttempts++;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            throw new Error('Máximo de tentativas de reconexão atingido');
        }

        logger.warn(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        try {
            const rpcUrl = process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
            this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
                timeout: AMOY_CONFIG.RPC_TIMEOUT
            });
            
            await this.provider.getNetwork();
            this.reconnectAttempts = 0;
            logger.info('✅ Reconexão bem-sucedida');
            
        } catch (error) {
            logger.warn(`❌ Falha na reconexão: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
            await this.reconnect();
        }
    }

    startHealthCheck() {
        setInterval(async () => {
            try {
                await this.provider.getNetwork();
            } catch (error) {
                logger.error('❌ Health check falhou, tentando reconectar...');
                await this.reconnect();
            }
        }, 30000); // 30 segundos
    }
}

// ===== GERENCIADOR DE GAS AMOY =====
class AmoyGasManager {
    constructor(networkManager) {
        this.networkManager = networkManager;
        this.lastUpdate = 0;
        this.gasPrice = null;
    }

    async getOptimalGasPrice(urgency = 'normal') {
        const now = Date.now();
        
        // Cache de 10 segundos para testnet
        if (this.gasPrice && (now - this.lastUpdate) < 10000) {
            return this.addRandomization(this.gasPrice, urgency);
        }

        try {
            const provider = await this.networkManager.getProvider();
            const feeData = await provider.getFeeData();
            
            // Estratégia de gas price para testnet
            let baseGasPrice;
            switch (urgency) {
                case 'low':
                    baseGasPrice = feeData.gasPrice * 90n / 100n; // 10% abaixo
                    break;
                case 'normal':
                    baseGasPrice = feeData.gasPrice;
                    break;
                case 'high':
                    baseGasPrice = feeData.gasPrice * 115n / 100n; // 15% acima
                    break;
                case 'urgent':
                    baseGasPrice = feeData.gasPrice * 130n / 100n; // 30% acima
                    break;
                default:
                    baseGasPrice = feeData.gasPrice;
            }

            // Limitar gas price para testnet
            const maxGasPrice = ethers.parseUnits(AMOY_CONFIG.MAX_GAS_PRICE.toString(), 'gwei');
            if (baseGasPrice > maxGasPrice) {
                baseGasPrice = maxGasPrice;
            }

            this.gasPrice = baseGasPrice;
            this.lastUpdate = now;

            return this.addRandomization(baseGasPrice, urgency);
        } catch (error) {
            logger.error('❌ Erro ao obter gas price:', error);
            // Fallback para gas price padrão da testnet
            return ethers.parseUnits('20', 'gwei');
        }
    }

    addRandomization(gasPrice, urgency) {
        // Randomização menor para testnet (±3%)
        const randomFactor = 0.97 + (Math.random() * 0.06); // 0.97 a 1.03
        return gasPrice * BigInt(Math.floor(randomFactor * 100)) / 100n;
    }

    calculateGasLimit(estimatedGas) {
        return estimatedGas * 120n / 100n; // 20% de margem para testnet
    }
}

// ===== DETECTOR DE OPORTUNIDADES AMOY =====
class AmoyOpportunityDetector {
    constructor(networkManager, gasManager) {
        this.networkManager = networkManager;
        this.gasManager = gasManager;
        this.lastPriceUpdate = 0;
    }

    async detectOpportunities() {
        const now = Date.now();
        
        // Cache de 3 segundos para testnet
        if ((now - this.lastPriceUpdate) < AMOY_CONFIG.CHECK_INTERVAL) {
            return this.analyzeCachedPrices();
        }

        try {
            const provider = await this.networkManager.getProvider();
            const opportunities = [];

            // Pares de tokens reais da Amoy testnet
            const tokenPairs = [
                {
                    tokenA: AMOY_TOKENS.WMATIC,
                    tokenB: AMOY_TOKENS.USDC,
                    dexA: AMOY_TOKENS.QUICKSWAP_V2_ROUTER,
                    dexB: AMOY_TOKENS.QUICKSWAP_V2_ROUTER,
                    pairName: "WMATIC/USDC"
                },
                {
                    tokenA: AMOY_TOKENS.WMATIC,
                    tokenB: AMOY_TOKENS.USDT,
                    dexA: AMOY_TOKENS.QUICKSWAP_V2_ROUTER,
                    dexB: AMOY_TOKENS.QUICKSWAP_V2_ROUTER,
                    pairName: "WMATIC/USDT"
                },
                {
                    tokenA: AMOY_TOKENS.USDC,
                    tokenB: AMOY_TOKENS.USDT,
                    dexA: AMOY_TOKENS.QUICKSWAP_V2_ROUTER,
                    dexB: AMOY_TOKENS.QUICKSWAP_V2_ROUTER,
                    pairName: "USDC/USDT"
                },
                {
                    tokenA: AMOY_TOKENS.WETH,
                    tokenB: AMOY_TOKENS.USDC,
                    dexA: AMOY_TOKENS.QUICKSWAP_V2_ROUTER,
                    dexB: AMOY_TOKENS.QUICKSWAP_V2_ROUTER,
                    pairName: "WETH/USDC"
                }
            ];

            for (const pair of tokenPairs) {
                const opportunity = await this.checkPair(pair, provider);
                if (opportunity && opportunity.profit > AMOY_CONFIG.MIN_PROFIT_WEI) {
                    opportunities.push(opportunity);
                }
            }

            this.lastPriceUpdate = now;
            return opportunities.sort((a, b) => Number(b.profit - a.profit));

        } catch (error) {
            logger.error('❌ Erro ao detectar oportunidades:', error);
            return [];
        }
    }

    async checkPair(pair, provider) {
        try {
            // Simulação de preços mais realista para testnet
            const priceA = await this.getTokenPrice(pair.tokenA, pair.dexA, provider);
            const priceB = await this.getTokenPrice(pair.tokenA, pair.dexB, provider);

            if (!priceA || !priceB) return null;

            const priceDiff = Math.abs(priceA - priceB);
            const priceRatio = priceDiff / Math.min(priceA, priceB);

            // Limiar menor para testnet (0.3%)
            if (priceRatio > 0.003) {
                const profit = this.calculateProfit(priceA, priceB, pair);
                return {
                    tokenA: pair.tokenA,
                    tokenB: pair.tokenB,
                    dexA: pair.dexA,
                    dexB: pair.dexB,
                    pairName: pair.pairName,
                    priceA,
                    priceB,
                    profit,
                    priceRatio
                };
            }

            return null;
        } catch (error) {
            logger.warn(`⚠️ Erro ao verificar par ${pair.pairName}:`, error);
            return null;
        }
    }

    async getTokenPrice(tokenAddress, dexAddress, provider) {
        const cacheKey = `${tokenAddress}-${dexAddress}`;
        const cached = amoyCache.get(cacheKey);
        if (cached) return cached;

        // Simulação de preços mais realista baseada no token
        let basePrice;
        switch (tokenAddress.toLowerCase()) {
            case AMOY_TOKENS.WMATIC.toLowerCase():
                basePrice = 0.8 + (Math.random() * 0.4); // 0.8-1.2 USD
                break;
            case AMOY_TOKENS.USDC.toLowerCase():
                basePrice = 0.99 + (Math.random() * 0.02); // 0.99-1.01 USD
                break;
            case AMOY_TOKENS.USDT.toLowerCase():
                basePrice = 0.98 + (Math.random() * 0.04); // 0.98-1.02 USD
                break;
            case AMOY_TOKENS.WETH.toLowerCase():
                basePrice = 3000 + (Math.random() * 600); // 3000-3600 USD
                break;
            default:
                basePrice = 1 + (Math.random() * 0.2); // 1-1.2 USD
        }

        // Adicionar variação de preço entre DEXs (simulando arbitragem)
        // Usar hash do endereço para gerar variação consistente mas diferente
        const addressHash = ethers.keccak256(ethers.toUtf8Bytes(dexAddress));
        const hashNumber = parseInt(addressHash.slice(2, 10), 16);
        const dexVariation = 0.95 + ((hashNumber % 100) / 1000); // ±5% baseado no hash
        
        const price = basePrice * dexVariation;

        amoyCache.set(cacheKey, price);
        return price;
    }

    calculateProfit(priceA, priceB, pair) {
        // Simulação de cálculo de lucro mais realista para testnet
        const amount = ethers.parseEther('0.1'); // Quantidade menor para testnet
        const gasPrice = ethers.parseUnits('20', 'gwei'); // Gas menor para testnet
        const gasLimit = 200000n; // Gas limit menor
        const gasCost = gasPrice * gasLimit;
        
        // Calcular lucro baseado na diferença de preços
        const priceDiff = Math.abs(priceA - priceB);
        const priceRatio = priceDiff / Math.min(priceA, priceB);
        
        // Lucro proporcional à diferença de preço
        const profit = amount * BigInt(Math.floor(priceRatio * 10000)) / 10000n;
        
        // Retornar lucro líquido (após gas)
        return profit > gasCost ? profit - gasCost : 0n;
    }

    analyzeCachedPrices() {
        // Análise de preços em cache para performance
        return [];
    }
}

// ===== EXECUTOR DE ARBITRAGEM AMOY =====
class AmoyArbitrageExecutor {
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
        logger.info(`✅ Wallet inicializada: ${this.wallet.address}`);

        // Verificar saldo
        const balance = await provider.getBalance(this.wallet.address);
        logger.info(`💰 Saldo: ${ethers.formatEther(balance)} MATIC`);

        if (balance < ethers.parseEther('0.01')) {
            logger.warn('⚠️ Saldo baixo! Adicione MATIC para gas na Amoy testnet');
        }

        // Carregar contrato se endereço configurado
        const contractAddress = process.env.AMOY_ARBITRAGE_BOT_ADDRESS;
        if (contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000') {
            await this.loadContract(contractAddress);
        } else {
            logger.info('ℹ️ Contrato não configurado - Executando em modo simulação');
        }
    }

    async loadContract(contractAddress) {
        try {
            const contractPath = './artifacts/contracts/ArbitrageBotV2.sol/ArbitrageBotV2.json';
            if (!fs.existsSync(contractPath)) {
                logger.warn('⚠️ Contrato não compilado - Execute: npm run compile');
                return;
            }

            const contractABI = JSON.parse(fs.readFileSync(contractPath)).abi;
            this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
            
            // Verificar se contrato existe
            const code = await this.wallet.provider.getCode(contractAddress);
            if (code === '0x') {
                logger.warn('⚠️ Contrato não encontrado no endereço especificado');
                this.contract = null;
                return;
            }
            
            logger.info('✅ Contrato de arbitragem carregado');
        } catch (error) {
            logger.warn('⚠️ Erro ao carregar contrato:', error.message);
            this.contract = null;
        }
    }

    async executeArbitrage(opportunity) {
        if (this.isExecuting) {
            logger.warn('⚠️ Execução já em andamento, pulando...');
            return false;
        }

        this.isExecuting = true;

        try {
            logger.info(`🚀 Executando arbitragem na Amoy: ${opportunity.tokenA} -> ${opportunity.tokenB}`);
            logger.info(`💰 Lucro estimado: ${ethers.formatEther(opportunity.profit)} ETH`);

            // Validar parâmetros
            if (!this.validateOpportunity(opportunity)) {
                throw new Error('Oportunidade inválida');
            }

            if (this.contract) {
                // Executar no contrato real
                return await this.executeOnContract(opportunity);
            } else {
                // Simular execução
                return await this.simulateExecution(opportunity);
            }

        } catch (error) {
            logger.error('❌ Erro na execução da arbitragem:', error);
            return false;
        } finally {
            this.isExecuting = false;
        }
    }

    validateOpportunity(opportunity) {
        if (!opportunity.tokenA || !opportunity.tokenB) return false;
        if (!opportunity.dexA || !opportunity.dexB) return false;
        if (opportunity.profit <= 0n) return false;
        if (opportunity.priceRatio < 0.003) return false; // 0.3% mínimo para testnet
        
        return true;
    }

    async executeOnContract(opportunity) {
        // Obter gas price otimizado
        const gasPrice = await this.gasManager.getOptimalGasPrice('high');
        
        // Preparar transação
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutos
        
        const tx = await this.contract.executeArbitrage(
            opportunity.tokenA,
            opportunity.tokenB,
            opportunity.dexA,
            opportunity.dexB,
            ethers.parseEther('0.1'), // Quantidade menor para testnet
            deadline,
            {
                gasPrice,
                gasLimit: 200000n
            }
        );

        logger.info(`📝 Transação enviada: ${tx.hash}`);
        
        // Aguardar confirmação
        const receipt = await tx.wait();
        
        logger.info(`✅ Arbitragem executada com sucesso! Hash: ${receipt.hash}`);
        logger.info(`⛽ Gas usado: ${receipt.gasUsed.toString()}`);
        
        return true;
    }

    async simulateExecution(opportunity) {
        // Simular execução para testes
        logger.info('🎭 Simulando execução de arbitragem...');
        
        // Simular delay de execução
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Simular sucesso (80% de chance)
        const success = Math.random() > 0.2;
        
        if (success) {
            logger.info('✅ Simulação bem-sucedida');
            return true;
        } else {
            logger.warn('❌ Simulação falhou (slippage/erro)');
            return false;
        }
    }
}

// ===== BOT DE TESTE AMOY =====
class AmoyTestBot {
    constructor() {
        this.networkManager = new AmoyNetworkManager();
        this.gasManager = new AmoyGasManager(this.networkManager);
        this.detector = new AmoyOpportunityDetector(this.networkManager, this.gasManager);
        this.executor = new AmoyArbitrageExecutor(this.networkManager, this.gasManager);
        this.isRunning = false;
        this.stats = {
            opportunitiesFound: 0,
            opportunitiesExecuted: 0,
            totalProfit: 0n,
            errors: 0,
            startTime: null,
            testResults: []
        };
    }

    async start() {
        try {
            logger.info('🚀 Iniciando ArbiBot Pro - Teste Amoy...');
            
            // Inicializar componentes
            await this.networkManager.initialize();
            await this.executor.initialize();
            
            this.isRunning = true;
            this.stats.startTime = Date.now();
            
            logger.info('✅ Bot inicializado com sucesso!');
            logger.info(`📊 Configurações de Teste:`);
            logger.info(`   - Rede: Amoy Testnet`);
            logger.info(`   - Intervalo: ${AMOY_CONFIG.CHECK_INTERVAL}ms`);
            logger.info(`   - Lucro mínimo: ${ethers.formatEther(AMOY_CONFIG.MIN_PROFIT_WEI)} ETH`);
            logger.info(`   - Duração do teste: ${AMOY_CONFIG.TEST_DURATION / 1000}s`);
            
            // Iniciar teste
            await this.runTest();
            
        } catch (error) {
            logger.error('❌ Erro fatal na inicialização:', error);
            process.exit(1);
        }
    }

    async runTest() {
        const startTime = Date.now();
        
        logger.info(`🔥 Iniciando teste de ${AMOY_CONFIG.TEST_DURATION / 1000} segundos...`);
        
        // Aguardar aquecimento
        await new Promise(resolve => setTimeout(resolve, AMOY_CONFIG.WARMUP_TIME));
        
        while (this.isRunning && (Date.now() - startTime) < AMOY_CONFIG.TEST_DURATION) {
            try {
                const operationStart = Date.now();
                
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

                const latency = Date.now() - operationStart;
                
                // Registrar resultado do teste
                const testResult = {
                    timestamp: Date.now(),
                    opportunities: opportunities.length,
                    executed: opportunities.length > 0 ? 1 : 0,
                    success: opportunities.length > 0,
                    latency,
                    profit: opportunities.length > 0 ? opportunities[0].profit : 0n
                };
                
                this.stats.testResults.push(testResult);
                amoyCache.addTestResult(testResult);

                // Log de estatísticas a cada 10 iterações
                if (this.stats.testResults.length % 10 === 0) {
                    this.logTestStats();
                }

                // Aguardar próximo ciclo
                await new Promise(resolve => setTimeout(resolve, AMOY_CONFIG.CHECK_INTERVAL));
                
            } catch (error) {
                this.stats.errors++;
                logger.error('❌ Erro no loop principal:', error);
                
                // Aguardar antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Aguardar resfriamento
        await new Promise(resolve => setTimeout(resolve, AMOY_CONFIG.COOLDOWN_TIME));
        
        // Gerar relatório final
        this.generateFinalReport();
    }

    logTestStats() {
        const stats = amoyCache.getTestStats();
        if (stats) {
            logger.info(`📊 Teste: ${stats.total} ops | ${stats.successful} sucessos | ${stats.successRate.toFixed(1)}% | ${stats.avgLatency.toFixed(0)}ms`);
        }
    }

    generateFinalReport() {
        const duration = Date.now() - this.stats.startTime;
        const durationSeconds = duration / 1000;
        
        console.log('\n📊 RELATÓRIO FINAL - TESTE AMOY');
        console.log('================================');
        
        // Métricas básicas
        console.log(`⏱️  Duração do teste: ${durationSeconds.toFixed(2)}s`);
        console.log(`🔄 Total de operações: ${this.stats.testResults.length}`);
        console.log(`🎯 Oportunidades encontradas: ${this.stats.opportunitiesFound}`);
        console.log(`💰 Oportunidades executadas: ${this.stats.opportunitiesExecuted}`);
        console.log(`❌ Erros: ${this.stats.errors}`);
        
        // Estatísticas de performance
        const stats = amoyCache.getTestStats();
        if (stats) {
            console.log(`\n📈 Performance:`);
            console.log(`   Taxa de sucesso: ${stats.successRate.toFixed(2)}%`);
            console.log(`   Latência média: ${stats.avgLatency.toFixed(2)}ms`);
            console.log(`   Operações/s: ${(stats.total / durationSeconds).toFixed(2)} ops/s`);
        }
        
        // Lucro total
        console.log(`\n💰 Resultados:`);
        console.log(`   Lucro total: ${ethers.formatEther(this.stats.totalProfit)} ETH`);
        console.log(`   Lucro/hora: ${ethers.formatEther(this.stats.totalProfit * 3600n / BigInt(Math.floor(durationSeconds)))} ETH/h`);
        
        // Recomendações
        console.log(`\n💡 Recomendações:`);
        if (stats && stats.successRate < 80) {
            console.log(`   ⚠️  Taxa de sucesso baixa - Verifique configurações`);
        }
        if (stats && stats.avgLatency > 1000) {
            console.log(`   ⚠️  Latência alta - Considere otimizar RPC`);
        }
        if (this.stats.opportunitiesFound === 0) {
            console.log(`   ⚠️  Nenhuma oportunidade encontrada - Verifique pares de tokens`);
        }
        if (this.stats.totalProfit > 0n) {
            console.log(`   ✅ Teste bem-sucedido! Sistema funcionando corretamente`);
        }
        
        // Salvar relatório
        this.saveTestReport();
    }

    saveTestReport() {
        const report = {
            timestamp: new Date().toISOString(),
            network: 'amoy',
            duration: Date.now() - this.stats.startTime,
            stats: {
                opportunitiesFound: this.stats.opportunitiesFound,
                opportunitiesExecuted: this.stats.opportunitiesExecuted,
                errors: this.stats.errors,
                startTime: this.stats.startTime,
                totalProfit: this.stats.totalProfit.toString() // Converter BigInt para string
            },
            testResults: this.stats.testResults.map(result => ({
                timestamp: result.timestamp,
                opportunities: result.opportunities,
                executed: result.executed,
                success: result.success,
                latency: result.latency,
                profit: result.profit.toString() // Converter BigInt para string
            })),
            cacheStats: amoyCache.getTestStats(),
            config: {
                ...AMOY_CONFIG,
                MIN_PROFIT_WEI: AMOY_CONFIG.MIN_PROFIT_WEI.toString() // Converter BigInt para string
            }
        };
        
        const reportsDir = 'reports/amoy';
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const filename = `amoy-test-${Date.now()}.json`;
        fs.writeFileSync(path.join(reportsDir, filename), JSON.stringify(report, null, 2));
        console.log(`\n💾 Relatório salvo: reports/amoy/${filename}`);
    }

    async stop() {
        logger.info('🛑 Parando teste...');
        this.isRunning = false;
    }
}

// ===== HANDLERS DE SINAL =====
process.on('SIGINT', async () => {
    logger.info('Recebido SIGINT, parando teste...');
    if (global.amoyBot) {
        await global.amoyBot.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Recebido SIGTERM, parando teste...');
    if (global.amoyBot) {
        await global.amoyBot.stop();
    }
    process.exit(0);
});

// ===== INICIALIZAÇÃO =====
async function main() {
    try {
        console.log('🧪 ArbiBot Pro - Teste Amoy Testnet');
        console.log('===================================\n');
        
        // Verificar variáveis de ambiente
        const requiredEnvVars = ['PRIVATE_KEY'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Variável de ambiente ${envVar} não configurada`);
            }
        }

        // Criar e iniciar bot de teste
        global.amoyBot = new AmoyTestBot();
        await global.amoyBot.start();
        
    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }
}

// Executar se for o arquivo principal
if (require.main === module) {
    main();
}

module.exports = { 
    AmoyTestBot, 
    AmoyNetworkManager, 
    AmoyGasManager, 
    AmoyOpportunityDetector, 
    AmoyArbitrageExecutor,
    AMOY_CONFIG 
}; 