const { LocalArbitrageBot } = require('./local-arbitrage-bot');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURAÇÃO DE TESTE =====
const TEST_CONFIG = {
    DURATION: 60000, // 1 minuto de teste
    INTERVAL: 1000,  // 1 segundo entre verificações
    WARMUP_TIME: 5000, // 5 segundos de aquecimento
    COOLDOWN_TIME: 3000, // 3 segundos de resfriamento
    MEMORY_CHECK_INTERVAL: 10000, // Verificar memória a cada 10s
    MAX_MEMORY_MB: 500, // Máximo de memória em MB
    TARGET_OPS_PER_SEC: 10, // Operações por segundo alvo
    TARGET_LATENCY_MS: 100 // Latência alvo em ms
};

// ===== MÉTRICAS DE PERFORMANCE =====
class PerformanceMetrics {
    constructor() {
        this.startTime = null;
        this.endTime = null;
        this.operations = 0;
        this.successfulOps = 0;
        this.failedOps = 0;
        this.totalLatency = 0;
        this.memoryUsage = [];
        this.gasUsed = [];
        this.errors = [];
        this.opportunitiesFound = 0;
        this.opportunitiesExecuted = 0;
    }

    start() {
        this.startTime = Date.now();
        console.log('🚀 Iniciando teste de performance...');
    }

    end() {
        this.endTime = Date.now();
        this.generateReport();
    }

    recordOperation(success, latency, gasUsed = 0) {
        this.operations++;
        this.totalLatency += latency;
        
        if (success) {
            this.successfulOps++;
        } else {
            this.failedOps++;
        }
        
        if (gasUsed > 0) {
            this.gasUsed.push(gasUsed);
        }
    }

    recordMemoryUsage() {
        const mem = process.memoryUsage();
        this.memoryUsage.push({
            timestamp: Date.now(),
            rss: Math.round(mem.rss / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
        });
    }

    recordError(error) {
        this.errors.push({
            timestamp: Date.now(),
            message: error.message,
            stack: error.stack
        });
    }

    generateReport() {
        const duration = this.endTime - this.startTime;
        const durationSeconds = duration / 1000;
        
        console.log('\n📊 RELATÓRIO DE PERFORMANCE');
        console.log('============================');
        
        // Métricas básicas
        console.log(`⏱️  Duração do teste: ${durationSeconds.toFixed(2)}s`);
        console.log(`🔄 Total de operações: ${this.operations}`);
        console.log(`✅ Operações bem-sucedidas: ${this.successfulOps}`);
        console.log(`❌ Operações falharam: ${this.failedOps}`);
        console.log(`📈 Taxa de sucesso: ${((this.successfulOps / this.operations) * 100).toFixed(2)}%`);
        
        // Performance
        const opsPerSec = this.operations / durationSeconds;
        const avgLatency = this.totalLatency / this.operations;
        console.log(`⚡ Operações por segundo: ${opsPerSec.toFixed(2)} ops/s`);
        console.log(`⏳ Latência média: ${avgLatency.toFixed(2)}ms`);
        
        // Memória
        if (this.memoryUsage.length > 0) {
            const avgMemory = this.memoryUsage.reduce((sum, mem) => sum + mem.heapUsed, 0) / this.memoryUsage.length;
            const maxMemory = Math.max(...this.memoryUsage.map(mem => mem.heapUsed));
            console.log(`💾 Uso médio de memória: ${avgMemory.toFixed(2)}MB`);
            console.log(`📈 Pico de memória: ${maxMemory}MB`);
        }
        
        // Gas
        if (this.gasUsed.length > 0) {
            const avgGas = this.gasUsed.reduce((sum, gas) => sum + gas, 0) / this.gasUsed.length;
            const totalGas = this.gasUsed.reduce((sum, gas) => sum + gas, 0);
            console.log(`⛽ Gas médio por operação: ${avgGas.toFixed(0)}`);
            console.log(`🔥 Total de gas usado: ${totalGas.toFixed(0)}`);
        }
        
        // Arbitragem
        console.log(`🎯 Oportunidades encontradas: ${this.opportunitiesFound}`);
        console.log(`💰 Oportunidades executadas: ${this.opportunitiesExecuted}`);
        
        // Erros
        if (this.errors.length > 0) {
            console.log(`⚠️  Total de erros: ${this.errors.length}`);
            console.log('📋 Últimos 5 erros:');
            this.errors.slice(-5).forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.message}`);
            });
        }
        
        // Análise de performance
        this.analyzePerformance(opsPerSec, avgLatency);
        
        // Salvar relatório
        this.saveReport();
    }

    analyzePerformance(opsPerSec, avgLatency) {
        console.log('\n🔍 ANÁLISE DE PERFORMANCE');
        console.log('========================');
        
        // Operações por segundo
        if (opsPerSec >= TEST_CONFIG.TARGET_OPS_PER_SEC) {
            console.log(`✅ Operações por segundo: EXCELENTE (${opsPerSec.toFixed(2)} ops/s)`);
        } else if (opsPerSec >= TEST_CONFIG.TARGET_OPS_PER_SEC * 0.8) {
            console.log(`⚠️  Operações por segundo: BOM (${opsPerSec.toFixed(2)} ops/s)`);
        } else {
            console.log(`❌ Operações por segundo: BAIXO (${opsPerSec.toFixed(2)} ops/s)`);
        }
        
        // Latência
        if (avgLatency <= TEST_CONFIG.TARGET_LATENCY_MS) {
            console.log(`✅ Latência: EXCELENTE (${avgLatency.toFixed(2)}ms)`);
        } else if (avgLatency <= TEST_CONFIG.TARGET_LATENCY_MS * 1.5) {
            console.log(`⚠️  Latência: BOM (${avgLatency.toFixed(2)}ms)`);
        } else {
            console.log(`❌ Latência: ALTA (${avgLatency.toFixed(2)}ms)`);
        }
        
        // Memória
        if (this.memoryUsage.length > 0) {
            const maxMemory = Math.max(...this.memoryUsage.map(mem => mem.heapUsed));
            if (maxMemory <= TEST_CONFIG.MAX_MEMORY_MB) {
                console.log(`✅ Uso de memória: EXCELENTE (${maxMemory}MB)`);
            } else {
                console.log(`⚠️  Uso de memória: ALTO (${maxMemory}MB)`);
            }
        }
        
        // Taxa de sucesso
        const successRate = (this.successfulOps / this.operations) * 100;
        if (successRate >= 95) {
            console.log(`✅ Taxa de sucesso: EXCELENTE (${successRate.toFixed(2)}%)`);
        } else if (successRate >= 80) {
            console.log(`⚠️  Taxa de sucesso: BOM (${successRate.toFixed(2)}%)`);
        } else {
            console.log(`❌ Taxa de sucesso: BAIXO (${successRate.toFixed(2)}%)`);
        }
    }

    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: this.endTime - this.startTime,
            operations: this.operations,
            successfulOps: this.successfulOps,
            failedOps: this.failedOps,
            successRate: (this.successfulOps / this.operations) * 100,
            opsPerSec: this.operations / ((this.endTime - this.startTime) / 1000),
            avgLatency: this.totalLatency / this.operations,
            memoryUsage: this.memoryUsage,
            gasUsed: this.gasUsed,
            errors: this.errors,
            opportunitiesFound: this.opportunitiesFound,
            opportunitiesExecuted: this.opportunitiesExecuted
        };
        
        const reportsDir = 'reports';
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const filename = `performance-${Date.now()}.json`;
        fs.writeFileSync(path.join(reportsDir, filename), JSON.stringify(report, null, 2));
        console.log(`\n💾 Relatório salvo: reports/${filename}`);
    }
}

// ===== TESTE DE PERFORMANCE =====
class PerformanceTest {
    constructor() {
        this.metrics = new PerformanceMetrics();
        this.bot = null;
        this.isRunning = false;
    }

    async start() {
        try {
            console.log('🧪 Iniciando teste de performance do ArbiBot Pro...');
            
            // Verificar ambiente
            this.checkEnvironment();
            
            // Criar bot
            this.bot = new LocalArbitrageBot();
            
            // Inicializar componentes básicos
            await this.bot.networkManager.initialize();
            
            // Iniciar métricas
            this.metrics.start();
            
            // Aguardar aquecimento
            console.log(`🔥 Aquecendo sistema por ${TEST_CONFIG.WARMUP_TIME / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.WARMUP_TIME));
            
            // Iniciar teste
            this.isRunning = true;
            await this.runTest();
            
        } catch (error) {
            console.error('❌ Erro no teste de performance:', error);
            this.metrics.recordError(error);
        } finally {
            this.cleanup();
        }
    }

    checkEnvironment() {
        // Verificar variáveis de ambiente
        if (!process.env.PRIVATE_KEY || !process.env.POLYGON_RPC_URL) {
            throw new Error('Variáveis de ambiente não configuradas');
        }
        
        // Verificar contrato compilado
        const contractPath = './artifacts/contracts/ArbitrageBotV2.sol/ArbitrageBotV2.json';
        if (!fs.existsSync(contractPath)) {
            throw new Error('Contrato não compilado. Execute: npm run compile');
        }
    }

    async runTest() {
        const startTime = Date.now();
        const memoryInterval = setInterval(() => {
            this.metrics.recordMemoryUsage();
        }, TEST_CONFIG.MEMORY_CHECK_INTERVAL);
        
        console.log(`🔄 Executando teste por ${TEST_CONFIG.DURATION / 1000}s...`);
        
        while (this.isRunning && (Date.now() - startTime) < TEST_CONFIG.DURATION) {
            try {
                const operationStart = Date.now();
                
                // Simular operação de arbitragem
                const success = await this.simulateArbitrageOperation();
                const latency = Date.now() - operationStart;
                
                this.metrics.recordOperation(success, latency);
                
                // Aguardar próximo ciclo
                await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.INTERVAL));
                
            } catch (error) {
                this.metrics.recordError(error);
                this.metrics.recordOperation(false, 0);
            }
        }
        
        clearInterval(memoryInterval);
        
        // Aguardar resfriamento
        console.log(`❄️  Resfriando sistema por ${TEST_CONFIG.COOLDOWN_TIME / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.COOLDOWN_TIME));
        
        this.metrics.end();
    }

    async simulateArbitrageOperation() {
        try {
            // Simular detecção de oportunidades
            const opportunities = await this.bot.detector.detectOpportunities();
            this.metrics.opportunitiesFound += opportunities.length;
            
            if (opportunities.length > 0) {
                this.metrics.opportunitiesExecuted++;
                return true;
            }
            
            return true; // Operação bem-sucedida mesmo sem oportunidades
            
        } catch (error) {
            throw error;
        }
    }

    cleanup() {
        this.isRunning = false;
        if (this.bot) {
            this.bot.stop();
        }
    }
}

// ===== EXECUÇÃO =====
async function main() {
    try {
        const test = new PerformanceTest();
        await test.start();
        
    } catch (error) {
        console.error('❌ Erro fatal no teste:', error);
        process.exit(1);
    }
}

// Executar se for o arquivo principal
if (require.main === module) {
    main();
}

module.exports = { PerformanceTest, PerformanceMetrics, TEST_CONFIG }; 