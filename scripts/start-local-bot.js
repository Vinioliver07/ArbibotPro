#!/usr/bin/env node

const { LocalArbitrageBot } = require('./local-arbitrage-bot');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURAÇÃO LOCAL SIMPLIFICADA =====
const LOCAL_CONFIG = {
    // Configurações de Performance
    MIN_PROFIT_ETH: 0.001, // Lucro mínimo em ETH
    CHECK_INTERVAL: 5000,  // Intervalo de verificação (5 segundos)
    MAX_GAS_PRICE: 50,     // Gas price máximo em Gwei
    
    // Configurações de Rede
    NETWORK: 'polygon',    // Rede principal
    RPC_TIMEOUT: 10000,    // Timeout do RPC em ms
    
    // Configurações de Segurança
    MAX_SLIPPAGE: 0.5,     // Slippage máximo em %
    USE_FLASHBOTS: false,  // Usar Flashbots (true/false)
    
    // Configurações de Log
    LOG_LEVEL: 'info',     // Nível de log
    LOG_TO_FILE: true,     // Salvar logs em arquivo
    LOG_TO_CONSOLE: true   // Mostrar logs no console
};

// ===== VERIFICAÇÃO DE AMBIENTE =====
function checkEnvironment() {
    console.log('🔍 Verificando ambiente...');
    
    // Verificar arquivo .env
    if (!fs.existsSync('.env')) {
        console.error('❌ Arquivo .env não encontrado!');
        console.log('📝 Crie um arquivo .env com as seguintes variáveis:');
        console.log('   PRIVATE_KEY=sua_chave_privada_aqui');
        console.log('   POLYGON_RPC_URL=sua_url_rpc_polygon');
        console.log('   ARBITRAGE_BOT_ADDRESS=endereco_do_contrato');
        process.exit(1);
    }
    
    // Verificar contrato compilado
    const contractPath = './artifacts/contracts/ArbitrageBotV2.sol/ArbitrageBotV2.json';
    if (!fs.existsSync(contractPath)) {
        console.error('❌ Contrato não compilado!');
        console.log('📝 Execute: npm run compile');
        process.exit(1);
    }
    
    // Verificar dependências
    try {
        require('ethers');
        require('winston');
        require('dotenv');
    } catch (error) {
        console.error('❌ Dependências não instaladas!');
        console.log('📝 Execute: npm install');
        process.exit(1);
    }
    
    console.log('✅ Ambiente verificado com sucesso!');
}

// ===== CONFIGURAÇÃO DE PERFORMANCE =====
function setupPerformance() {
    console.log('⚡ Configurando performance...');
    
    // Aumentar limite de listeners
    process.setMaxListeners(20);
    
    // Configurar timeouts
    process.env.NODE_OPTIONS = '--max-old-space-size=4096';
    
    // Configurar timezone
    process.env.TZ = 'UTC';
    
    console.log('✅ Performance configurada!');
}

// ===== MONITORAMENTO DE RECURSOS =====
function startResourceMonitoring() {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    setInterval(() => {
        const currentTime = Date.now();
        const currentMemory = process.memoryUsage();
        const uptime = Math.floor((currentTime - startTime) / 1000);
        
        const memoryUsage = {
            rss: Math.round(currentMemory.rss / 1024 / 1024),
            heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
            heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024)
        };
        
        console.log(`📊 Uptime: ${uptime}s | Memória: ${memoryUsage.heapUsed}MB/${memoryUsage.heapTotal}MB`);
        
        // Alertar se uso de memória estiver alto
        if (memoryUsage.heapUsed > 500) {
            console.warn('⚠️  Uso de memória alto detectado!');
        }
    }, 60000); // A cada minuto
}

// ===== FUNÇÃO PRINCIPAL =====
async function main() {
    try {
        console.log('🚀 ArbiBot Pro - Versão Local');
        console.log('================================');
        
        // Verificar ambiente
        checkEnvironment();
        
        // Configurar performance
        setupPerformance();
        
        // Carregar variáveis de ambiente
        require('dotenv').config();
        
        // Verificar variáveis obrigatórias
        const requiredVars = ['PRIVATE_KEY', 'POLYGON_RPC_URL'];
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                throw new Error(`Variável ${varName} não configurada no .env`);
            }
        }
        
        console.log('✅ Configuração carregada!');
        console.log(`🌐 Rede: ${LOCAL_CONFIG.NETWORK}`);
        console.log(`💰 Lucro mínimo: ${LOCAL_CONFIG.MIN_PROFIT_ETH} ETH`);
        console.log(`⏱️  Intervalo: ${LOCAL_CONFIG.CHECK_INTERVAL}ms`);
        console.log(`🛡️  Flashbots: ${LOCAL_CONFIG.USE_FLASHBOTS ? 'Ativado' : 'Desativado'}`);
        console.log('');
        
        // Iniciar monitoramento de recursos
        startResourceMonitoring();
        
        // Criar e iniciar bot
        console.log('🤖 Iniciando bot de arbitragem...');
        const bot = new LocalArbitrageBot();
        
        // Configurar handlers de parada
        process.on('SIGINT', async () => {
            console.log('\n🛑 Parando bot...');
            await bot.stop();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('\n🛑 Parando bot...');
            await bot.stop();
            process.exit(0);
        });
        
        // Iniciar bot
        await bot.start();
        
    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// ===== EXECUÇÃO =====
if (require.main === module) {
    main();
}

module.exports = { main, LOCAL_CONFIG }; 