const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

// ===== CONFIGURAÇÃO DE TESTE =====
const NETWORK_TEST_CONFIG = {
    TIMEOUT: 10000, // 10 segundos
    RETRY_ATTEMPTS: 3,
    TEST_BLOCK_NUMBER: 1000,
    TEST_ADDRESS: '0x0000000000000000000000000000000000000000'
};

// ===== TESTE DE REDE =====
class NetworkTester {
    constructor() {
        this.results = {
            providers: {},
            overall: {
                success: false,
                bestProvider: null,
                avgLatency: 0,
                errors: []
            }
        };
    }

    async testAllProviders() {
        console.log('🌐 Testando conectividade de rede...\n');
        
        const providers = this.getProviders();
        
        for (const [name, url] of Object.entries(providers)) {
            if (url) {
                console.log(`🔍 Testando ${name}...`);
                await this.testProvider(name, url);
            }
        }
        
        this.analyzeResults();
        this.generateReport();
    }

    getProviders() {
        return {
            'Polygon RPC': process.env.POLYGON_RPC_URL,
            'QuickNode': process.env.QUICKNODE_RPC_URL,
            'Alchemy': process.env.ALCHEMY_RPC_URL
        };
    }

    async testProvider(name, url) {
        const results = {
            name,
            url: url.substring(0, 50) + '...',
            connected: false,
            latency: 0,
            blockNumber: 0,
            gasPrice: 0,
            network: null,
            errors: []
        };

        try {
            const provider = new ethers.JsonRpcProvider(url, undefined, {
                timeout: NETWORK_TEST_CONFIG.TIMEOUT
            });

            // Teste 1: Conectividade básica
            const startTime = Date.now();
            const network = await provider.getNetwork();
            const latency = Date.now() - startTime;
            
            results.connected = true;
            results.latency = latency;
            results.network = network;

            // Teste 2: Obter block number
            const blockNumber = await provider.getBlockNumber();
            results.blockNumber = blockNumber;

            // Teste 3: Obter gas price
            const feeData = await provider.getFeeData();
            results.gasPrice = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));

            // Teste 4: Verificar balance (se PRIVATE_KEY configurada)
            if (process.env.PRIVATE_KEY) {
                const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
                const balance = await provider.getBalance(wallet.address);
                results.balance = ethers.formatEther(balance);
            }

            console.log(`   ✅ Conectado (${latency}ms) | Block: ${blockNumber} | Gas: ${results.gasPrice.toFixed(2)} Gwei`);

        } catch (error) {
            results.errors.push(error.message);
            console.log(`   ❌ Falha: ${error.message}`);
        }

        this.results.providers[name] = results;
    }

    analyzeResults() {
        const workingProviders = Object.values(this.results.providers)
            .filter(p => p.connected);

        if (workingProviders.length === 0) {
            this.results.overall.success = false;
            this.results.overall.errors.push('Nenhum provider funcionando');
            return;
        }

        // Encontrar melhor provider (menor latência)
        const bestProvider = workingProviders.reduce((best, current) => 
            current.latency < best.latency ? current : best
        );

        const avgLatency = workingProviders.reduce((sum, p) => sum + p.latency, 0) / workingProviders.length;

        this.results.overall.success = true;
        this.results.overall.bestProvider = bestProvider.name;
        this.results.overall.avgLatency = avgLatency;
    }

    generateReport() {
        console.log('\n📊 RELATÓRIO DE CONECTIVIDADE');
        console.log('==============================');

        if (!this.results.overall.success) {
            console.log('❌ Nenhum provider funcionando!');
            console.log('📋 Erros encontrados:');
            this.results.overall.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
            return;
        }

        console.log(`✅ Conectividade: FUNCIONANDO`);
        console.log(`🏆 Melhor provider: ${this.results.overall.bestProvider}`);
        console.log(`⏱️  Latência média: ${this.results.overall.avgLatency.toFixed(2)}ms`);

        console.log('\n📋 Detalhes por Provider:');
        Object.values(this.results.providers).forEach(provider => {
            const status = provider.connected ? '✅' : '❌';
            const latency = provider.connected ? `(${provider.latency}ms)` : '';
            console.log(`   ${status} ${provider.name} ${latency}`);
            
            if (provider.connected) {
                console.log(`      Block: ${provider.blockNumber}`);
                console.log(`      Gas: ${provider.gasPrice.toFixed(2)} Gwei`);
                if (provider.balance) {
                    console.log(`      Balance: ${provider.balance} MATIC`);
                }
            }
        });

        this.generateRecommendations();
    }

    generateRecommendations() {
        console.log('\n💡 RECOMENDAÇÕES');
        console.log('================');

        const workingProviders = Object.values(this.results.providers)
            .filter(p => p.connected);

        if (workingProviders.length === 1) {
            console.log('⚠️  Apenas 1 provider funcionando - Configure providers de backup');
        }

        const slowProviders = workingProviders.filter(p => p.latency > 1000);
        if (slowProviders.length > 0) {
            console.log('⚠️  Providers lentos detectados - Considere trocar RPC');
        }

        const highGasProviders = workingProviders.filter(p => p.gasPrice > 50);
        if (highGasProviders.length > 0) {
            console.log('⚠️  Gas price alto - Considere aguardar ou usar outro provider');
        }

        if (workingProviders.length >= 2) {
            console.log('✅ Múltiplos providers funcionando - Sistema robusto');
        }

        // Verificar configuração de wallet
        if (!process.env.PRIVATE_KEY) {
            console.log('⚠️  PRIVATE_KEY não configurada - Configure para testes completos');
        } else {
            const hasBalance = workingProviders.some(p => p.balance && parseFloat(p.balance) > 0.01);
            if (!hasBalance) {
                console.log('⚠️  Saldo baixo - Adicione MATIC para gas');
            } else {
                console.log('✅ Wallet configurada e com saldo');
            }
        }
    }

    async testContractInteraction() {
        console.log('\n🔧 Testando interação com contrato...');

        if (!process.env.ARBITRAGE_BOT_ADDRESS) {
            console.log('⚠️  ARBITRAGE_BOT_ADDRESS não configurada');
            return;
        }

        const contractAddress = process.env.ARBITRAGE_BOT_ADDRESS;
        
        // Encontrar melhor provider
        const bestProvider = Object.values(this.results.providers)
            .filter(p => p.connected)
            .reduce((best, current) => current.latency < best.latency ? current : best);

        if (!bestProvider) {
            console.log('❌ Nenhum provider disponível para teste de contrato');
            return;
        }

        try {
            const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
            
            // Verificar se contrato existe
            const code = await provider.getCode(contractAddress);
            if (code === '0x') {
                console.log('❌ Contrato não encontrado no endereço especificado');
                return;
            }

            console.log('✅ Contrato encontrado');

            // Tentar carregar ABI
            const contractPath = './artifacts/contracts/ArbitrageBotV2.sol/ArbitrageBotV2.json';
            if (!fs.existsSync(contractPath)) {
                console.log('⚠️  ABI não encontrada - Execute: npm run compile');
                return;
            }

            const contractABI = JSON.parse(fs.readFileSync(contractPath)).abi;
            const contract = new ethers.Contract(contractAddress, contractABI, provider);

            // Testar chamadas básicas
            try {
                const owner = await contract.owner();
                console.log(`✅ Owner do contrato: ${owner}`);
            } catch (error) {
                console.log('⚠️  Não foi possível obter owner do contrato');
            }

            try {
                const paused = await contract.paused();
                console.log(`✅ Status do contrato: ${paused ? 'Pausado' : 'Ativo'}`);
            } catch (error) {
                console.log('⚠️  Não foi possível verificar status do contrato');
            }

        } catch (error) {
            console.log(`❌ Erro ao testar contrato: ${error.message}`);
        }
    }
}

// ===== EXECUÇÃO =====
async function main() {
    try {
        console.log('🚀 Teste de Conectividade - ArbiBot Pro');
        console.log('=======================================\n');

        const tester = new NetworkTester();
        await tester.testAllProviders();
        await tester.testContractInteraction();

        console.log('\n✅ Teste concluído!');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        process.exit(1);
    }
}

// Executar se for o arquivo principal
if (require.main === module) {
    main();
}

module.exports = { NetworkTester, NETWORK_TEST_CONFIG }; 