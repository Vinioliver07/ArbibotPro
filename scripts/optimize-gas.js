const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ===== CONFIGURAÇÃO DE OTIMIZAÇÃO =====
const GAS_OPTIMIZATION_CONFIG = {
    TARGET_GAS_LIMIT: 300000,
    MAX_GAS_PRICE_GWEI: 50,
    MIN_PROFIT_ETH: 0.001,
    GAS_LIMIT_MARGIN: 1.2,
    PRICE_UPDATE_INTERVAL: 15000,
    ANALYSIS_DURATION: 300000 // 5 minutos
};

// ===== OTIMIZADOR DE GAS =====
class GasOptimizer {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.gasHistory = [];
        this.priceHistory = [];
        this.optimizationResults = {
            recommendedGasPrice: 0,
            recommendedGasLimit: 0,
            estimatedCost: 0,
            profitThreshold: 0,
            optimizations: []
        };
    }

    async initialize() {
        try {
            console.log('🔧 Inicializando otimizador de gas...');
            
            // Verificar configuração
            if (!process.env.PRIVATE_KEY || !process.env.POLYGON_RPC_URL) {
                throw new Error('PRIVATE_KEY e POLYGON_RPC_URL são obrigatórios');
            }

            // Configurar provider
            this.provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
            
            // Configurar wallet
            this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            console.log(`✅ Wallet configurada: ${this.wallet.address}`);

            // Carregar contrato se endereço configurado
            if (process.env.ARBITRAGE_BOT_ADDRESS) {
                await this.loadContract();
            }

            console.log('✅ Otimizador inicializado');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }

    async loadContract() {
        try {
            const contractPath = './artifacts/contracts/ArbitrageBotV2.sol/ArbitrageBotV2.json';
            if (!fs.existsSync(contractPath)) {
                console.log('⚠️  Contrato não compilado - Execute: npm run compile');
                return;
            }

            const contractABI = JSON.parse(fs.readFileSync(contractPath)).abi;
            this.contract = new ethers.Contract(process.env.ARBITRAGE_BOT_ADDRESS, contractABI, this.wallet);
            console.log('✅ Contrato carregado');
            
        } catch (error) {
            console.log('⚠️  Erro ao carregar contrato:', error.message);
        }
    }

    async analyzeGasTrends() {
        console.log('📊 Analisando tendências de gas...');
        
        const startTime = Date.now();
        const dataPoints = [];

        while (Date.now() - startTime < GAS_OPTIMIZATION_CONFIG.ANALYSIS_DURATION) {
            try {
                const feeData = await this.provider.getFeeData();
                const blockNumber = await this.provider.getBlockNumber();
                
                const gasData = {
                    timestamp: Date.now(),
                    blockNumber,
                    gasPrice: Number(ethers.formatUnits(feeData.gasPrice, 'gwei')),
                    maxFeePerGas: feeData.maxFeePerGas ? Number(ethers.formatUnits(feeData.maxFeePerGas, 'gwei')) : null,
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? Number(ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei')) : null,
                    baseFeePerGas: feeData.lastBaseFeePerGas ? Number(ethers.formatUnits(feeData.lastBaseFeePerGas, 'gwei')) : null
                };

                dataPoints.push(gasData);
                this.gasHistory.push(gasData);

                // Mostrar progresso
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const total = Math.floor(GAS_OPTIMIZATION_CONFIG.ANALYSIS_DURATION / 1000);
                process.stdout.write(`\r📈 Coletando dados: ${elapsed}s/${total}s | Gas atual: ${gasData.gasPrice.toFixed(2)} Gwei`);

                await new Promise(resolve => setTimeout(resolve, GAS_OPTIMIZATION_CONFIG.PRICE_UPDATE_INTERVAL));
                
            } catch (error) {
                console.log(`\n⚠️  Erro ao coletar dados: ${error.message}`);
            }
        }

        console.log('\n✅ Análise de tendências concluída');
        return dataPoints;
    }

    calculateOptimalGasPrice(gasHistory) {
        if (gasHistory.length === 0) {
            return GAS_OPTIMIZATION_CONFIG.MAX_GAS_PRICE_GWEI;
        }

        // Calcular estatísticas
        const prices = gasHistory.map(d => d.gasPrice);
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.min(Math.max(...prices), GAS_OPTIMIZATION_CONFIG.MAX_GAS_PRICE_GWEI);
        
        // Calcular percentis
        const sortedPrices = prices.sort((a, b) => a - b);
        const p25 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
        const p50 = sortedPrices[Math.floor(sortedPrices.length * 0.50)];
        const p75 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];

        // Estratégia de otimização: usar o percentil 75 para garantir confirmação rápida
        const recommendedPrice = Math.min(p75, GAS_OPTIMIZATION_CONFIG.MAX_GAS_PRICE_GWEI);

        this.optimizationResults.recommendedGasPrice = recommendedPrice;
        this.optimizationResults.gasStats = {
            average: avgPrice,
            minimum: minPrice,
            maximum: maxPrice,
            p25,
            p50,
            p75
        };

        return recommendedPrice;
    }

    async estimateGasLimit() {
        if (!this.contract) {
            return GAS_OPTIMIZATION_CONFIG.TARGET_GAS_LIMIT;
        }

        try {
            // Simular transação de arbitragem
            const mockData = {
                tokenA: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
                tokenB: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH
                dexA: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
                dexB: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
                amount: ethers.parseEther('1'),
                deadline: Math.floor(Date.now() / 1000) + 300
            };

            const estimatedGas = await this.contract.executeArbitrage.estimateGas(
                mockData.tokenA,
                mockData.tokenB,
                mockData.dexA,
                mockData.dexB,
                mockData.amount,
                mockData.deadline
            );

            const recommendedLimit = Math.ceil(Number(estimatedGas) * GAS_OPTIMIZATION_CONFIG.GAS_LIMIT_MARGIN);
            this.optimizationResults.recommendedGasLimit = recommendedLimit;

            return recommendedLimit;

        } catch (error) {
            console.log('⚠️  Erro ao estimar gas limit:', error.message);
            return GAS_OPTIMIZATION_CONFIG.TARGET_GAS_LIMIT;
        }
    }

    calculateProfitThreshold(gasPrice, gasLimit) {
        const gasCost = gasPrice * gasLimit;
        const gasCostEth = gasCost / 1e9; // Converter de Gwei para ETH
        
        // Lucro mínimo deve ser 2x o custo do gas para ser rentável
        const profitThreshold = gasCostEth * 2;
        
        this.optimizationResults.estimatedCost = gasCostEth;
        this.optimizationResults.profitThreshold = profitThreshold;

        return profitThreshold;
    }

    generateOptimizations() {
        const optimizations = [];

        // Verificar se gas price está alto
        if (this.optimizationResults.recommendedGasPrice > 30) {
            optimizations.push({
                type: 'warning',
                message: 'Gas price alto detectado',
                recommendation: 'Considere aguardar ou usar proteção MEV'
            });
        }

        // Verificar se gas limit está otimizado
        if (this.optimizationResults.recommendedGasLimit > 400000) {
            optimizations.push({
                type: 'warning',
                message: 'Gas limit alto',
                recommendation: 'Otimize o contrato para reduzir gas usage'
            });
        }

        // Verificar rentabilidade
        if (this.optimizationResults.profitThreshold > 0.01) {
            optimizations.push({
                type: 'info',
                message: 'Limiar de lucro alto',
                recommendation: 'Configure lucro mínimo adequado'
            });
        }

        // Verificar se há oportunidades de economia
        const avgPrice = this.optimizationResults.gasStats?.average || 0;
        if (this.optimizationResults.recommendedGasPrice > avgPrice * 1.5) {
            optimizations.push({
                type: 'opportunity',
                message: 'Oportunidade de economia',
                recommendation: 'Gas price atual está acima da média'
            });
        }

        this.optimizationResults.optimizations = optimizations;
        return optimizations;
    }

    generateReport() {
        console.log('\n📊 RELATÓRIO DE OTIMIZAÇÃO DE GAS');
        console.log('==================================');

        // Configurações recomendadas
        console.log(`⛽ Gas Price Recomendado: ${this.optimizationResults.recommendedGasPrice.toFixed(2)} Gwei`);
        console.log(`🔥 Gas Limit Recomendado: ${this.optimizationResults.recommendedGasLimit.toLocaleString()}`);
        console.log(`💰 Custo Estimado: ${this.optimizationResults.estimatedCost.toFixed(6)} ETH`);
        console.log(`🎯 Limiar de Lucro: ${this.optimizationResults.profitThreshold.toFixed(6)} ETH`);

        // Estatísticas de gas
        if (this.optimizationResults.gasStats) {
            console.log('\n📈 Estatísticas de Gas Price:');
            console.log(`   Média: ${this.optimizationResults.gasStats.average.toFixed(2)} Gwei`);
            console.log(`   Mínimo: ${this.optimizationResults.gasStats.minimum.toFixed(2)} Gwei`);
            console.log(`   Máximo: ${this.optimizationResults.gasStats.maximum.toFixed(2)} Gwei`);
            console.log(`   P25: ${this.optimizationResults.gasStats.p25.toFixed(2)} Gwei`);
            console.log(`   P50: ${this.optimizationResults.gasStats.p50.toFixed(2)} Gwei`);
            console.log(`   P75: ${this.optimizationResults.gasStats.p75.toFixed(2)} Gwei`);
        }

        // Otimizações
        if (this.optimizationResults.optimizations.length > 0) {
            console.log('\n💡 Recomendações:');
            this.optimizationResults.optimizations.forEach((opt, index) => {
                const icon = opt.type === 'warning' ? '⚠️' : opt.type === 'opportunity' ? '💡' : 'ℹ️';
                console.log(`   ${index + 1}. ${icon} ${opt.message}`);
                console.log(`      → ${opt.recommendation}`);
            });
        }

        // Configuração para .env
        console.log('\n🔧 Configuração para .env:');
        console.log(`MAX_GAS_PRICE=${this.optimizationResults.recommendedGasPrice.toFixed(0)}`);
        console.log(`GAS_LIMIT_MULTIPLIER=${GAS_OPTIMIZATION_CONFIG.GAS_LIMIT_MARGIN}`);
        console.log(`MIN_PROFIT_ETH=${this.optimizationResults.profitThreshold.toFixed(6)}`);

        // Salvar relatório
        this.saveReport();
    }

    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            ...this.optimizationResults,
            gasHistory: this.gasHistory.slice(-100) // Últimos 100 pontos
        };

        const reportsDir = 'reports';
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const filename = `gas-optimization-${Date.now()}.json`;
        fs.writeFileSync(path.join(reportsDir, filename), JSON.stringify(report, null, 2));
        console.log(`\n💾 Relatório salvo: reports/${filename}`);
    }

    async runOptimization() {
        try {
            await this.initialize();
            
            // Analisar tendências
            const gasData = await this.analyzeGasTrends();
            
            // Calcular gas price otimizado
            const optimalGasPrice = this.calculateOptimalGasPrice(gasData);
            
            // Estimar gas limit
            const optimalGasLimit = await this.estimateGasLimit();
            
            // Calcular limiar de lucro
            const profitThreshold = this.calculateProfitThreshold(optimalGasPrice, optimalGasLimit);
            
            // Gerar otimizações
            this.generateOptimizations();
            
            // Gerar relatório
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erro na otimização:', error);
            throw error;
        }
    }
}

// ===== EXECUÇÃO =====
async function main() {
    try {
        console.log('🚀 Otimizador de Gas - ArbiBot Pro');
        console.log('==================================\n');

        const optimizer = new GasOptimizer();
        await optimizer.runOptimization();

        console.log('\n✅ Otimização concluída!');
        
    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }
}

// Executar se for o arquivo principal
if (require.main === module) {
    main();
}

module.exports = { GasOptimizer, GAS_OPTIMIZATION_CONFIG }; 