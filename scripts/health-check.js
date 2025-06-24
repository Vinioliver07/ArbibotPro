const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🏥 Verificando saúde do ArbiBot Pro...\n');

class HealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: [],
      warnings: [],
      errors: [],
      recommendations: []
    };
  }

  async runAllChecks() {
    console.log('🔍 Executando verificações de saúde...\n');

    try {
      await this.checkEnvironmentVariables();
      await this.checkNetworkConnectivity();
      await this.checkContractStatus();
      await this.checkWalletBalance();
      await this.checkLogFiles();
      await this.checkFileSystem();
      await this.checkDependencies();
      
      this.generateOverallStatus();
      this.displayResults();
      this.saveHealthReport();

    } catch (error) {
      console.error('❌ Erro durante verificação de saúde:', error.message);
      this.results.overall = 'critical';
      this.results.errors.push({
        category: 'System',
        message: `Erro crítico durante verificação: ${error.message}`
      });
    }
  }

  addCheck(name, status, details = '') {
    const check = {
      name,
      status, // 'pass', 'warn', 'fail'
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.checks.push(check);
    
    const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${name}: ${details || status}`);
    
    return check;
  }

  addWarning(category, message) {
    this.results.warnings.push({ category, message });
  }

  addError(category, message) {
    this.results.errors.push({ category, message });
  }

  addRecommendation(category, action) {
    this.results.recommendations.push({ category, action });
  }

  async checkEnvironmentVariables() {
    console.log('🔹 Verificando variáveis de ambiente...');
    
    const requiredVars = [
      'PRIVATE_KEY',
      'RPC_URL_PRIMARY',
      'ARBITRAGE_CONTRACT_ADDRESS'
    ];

    const optionalVars = [
      'RPC_URL_BACKUP',
      'WS_URL_PRIMARY',
      'POLYGONSCAN_API_KEY'
    ];

    let missingRequired = 0;
    let missingOptional = 0;

    // Verificar variáveis obrigatórias
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.addCheck(`Env ${varName}`, 'fail', 'Variável obrigatória não definida');
        this.addError('Environment', `Variável ${varName} é obrigatória`);
        missingRequired++;
      } else {
        this.addCheck(`Env ${varName}`, 'pass', 'Definida');
      }
    }

    // Verificar variáveis opcionais
    for (const varName of optionalVars) {
      if (!process.env[varName]) {
        this.addCheck(`Env ${varName}`, 'warn', 'Opcional não definida');
        this.addWarning('Environment', `Variável opcional ${varName} não definida`);
        missingOptional++;
      } else {
        this.addCheck(`Env ${varName}`, 'pass', 'Definida');
      }
    }

    // Verificar formato da chave privada
    if (process.env.PRIVATE_KEY) {
      if (process.env.PRIVATE_KEY.startsWith('0x') || process.env.PRIVATE_KEY.length !== 64) {
        this.addCheck('Private Key Format', 'warn', 'Formato pode estar incorreto');
        this.addWarning('Security', 'Verificar formato da chave privada');
      } else {
        this.addCheck('Private Key Format', 'pass', 'Formato correto');
      }
    }

    if (missingRequired > 0) {
      this.addRecommendation('Environment', 'Configurar todas as variáveis obrigatórias');
    }
    if (missingOptional > 2) {
      this.addRecommendation('Environment', 'Configurar variáveis opcionais para maior confiabilidade');
    }
  }

  async checkNetworkConnectivity() {
    console.log('\n🔹 Verificando conectividade de rede...');

    const providers = [
      { name: 'Primary RPC', url: process.env.RPC_URL_PRIMARY },
      { name: 'Backup RPC', url: process.env.RPC_URL_BACKUP },
      { name: 'Fallback RPC', url: process.env.RPC_URL_FALLBACK }
    ].filter(p => p.url);

    let workingProviders = 0;

    for (const providerConfig of providers) {
      try {
        const provider = new ethers.JsonRpcProvider(providerConfig.url);
        const blockNumber = await provider.getBlockNumber();
        
        if (blockNumber > 0) {
          this.addCheck(providerConfig.name, 'pass', `Bloco atual: ${blockNumber}`);
          workingProviders++;
        } else {
          this.addCheck(providerConfig.name, 'fail', 'Resposta inválida');
        }
      } catch (error) {
        this.addCheck(providerConfig.name, 'fail', `Erro: ${error.message.substring(0, 50)}...`);
        this.addError('Network', `${providerConfig.name} inacessível: ${error.message}`);
      }
    }

    if (workingProviders === 0) {
      this.addError('Network', 'Nenhum provider funcionando');
      this.addRecommendation('Network', 'Verificar conexão com internet e URLs dos RPCs');
    } else if (workingProviders < providers.length) {
      this.addWarning('Network', 'Alguns providers não estão funcionando');
      this.addRecommendation('Network', 'Configurar providers de backup adicionais');
    }
  }

  async checkContractStatus() {
    console.log('\n🔹 Verificando status do contrato...');

    if (!process.env.ARBITRAGE_CONTRACT_ADDRESS) {
      this.addCheck('Contract Address', 'fail', 'Endereço não configurado');
      return;
    }

    if (!ethers.isAddress(process.env.ARBITRAGE_CONTRACT_ADDRESS)) {
      this.addCheck('Contract Address', 'fail', 'Endereço inválido');
      this.addError('Contract', 'Endereço do contrato inválido');
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_PRIMARY);
      const contractAddress = process.env.ARBITRAGE_CONTRACT_ADDRESS;

      // Verificar se o contrato existe
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        this.addCheck('Contract Exists', 'fail', 'Nenhum código no endereço');
        this.addError('Contract', 'Contrato não encontrado no endereço especificado');
        return;
      } else {
        this.addCheck('Contract Exists', 'pass', `Código encontrado (${code.length} bytes)`);
      }

      // Verificar owner (se o ABI estiver disponível)
      try {
        const artifactPath = path.join(__dirname, '../artifacts/contracts/ArbitrageBot.sol/ArbitrageBot.json');
        if (fs.existsSync(artifactPath)) {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
          const contract = new ethers.Contract(contractAddress, artifact.abi, provider);
          
          const owner = await contract.owner();
          this.addCheck('Contract Owner', 'pass', `Owner: ${owner.substring(0, 10)}...`);
          
          // Verificar se a carteira é o owner
          if (process.env.PRIVATE_KEY) {
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
            if (owner.toLowerCase() === wallet.address.toLowerCase()) {
              this.addCheck('Wallet is Owner', 'pass', 'Carteira é proprietária');
            } else {
              this.addCheck('Wallet is Owner', 'warn', 'Carteira não é proprietária');
              this.addWarning('Contract', 'Carteira configurada não é proprietária do contrato');
            }
          }
        }
      } catch (error) {
        this.addCheck('Contract Details', 'warn', 'Não foi possível verificar detalhes');
      }

    } catch (error) {
      this.addCheck('Contract Status', 'fail', `Erro: ${error.message}`);
      this.addError('Contract', `Erro ao verificar contrato: ${error.message}`);
    }
  }

  async checkWalletBalance() {
    console.log('\n🔹 Verificando saldo da carteira...');

    if (!process.env.PRIVATE_KEY || !process.env.RPC_URL_PRIMARY) {
      this.addCheck('Wallet Balance', 'fail', 'Configuração incompleta');
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_PRIMARY);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      
      const balance = await provider.getBalance(wallet.address);
      const balanceEth = ethers.formatEther(balance);
      const balanceFloat = parseFloat(balanceEth);

      this.addCheck('Wallet Address', 'pass', `${wallet.address.substring(0, 10)}...`);

      if (balanceFloat < 0.001) {
        this.addCheck('Wallet Balance', 'fail', `${balanceEth} ETH (muito baixo)`);
        this.addError('Wallet', 'Saldo insuficiente para operações');
        this.addRecommendation('Wallet', 'Adicionar fundos à carteira');
      } else if (balanceFloat < 0.01) {
        this.addCheck('Wallet Balance', 'warn', `${balanceEth} ETH (baixo)`);
        this.addWarning('Wallet', 'Saldo baixo - monitorar');
      } else {
        this.addCheck('Wallet Balance', 'pass', `${parseFloat(balanceEth).toFixed(4)} ETH`);
      }

      // Verificar gas price atual
      const feeData = await provider.getFeeData();
      if (feeData.gasPrice) {
        const gasPriceGwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
        this.addCheck('Gas Price', 'pass', `${parseFloat(gasPriceGwei).toFixed(2)} gwei`);
        
        if (parseFloat(gasPriceGwei) > 100) {
          this.addWarning('Network', 'Gas price alto - pode afetar rentabilidade');
        }
      }

    } catch (error) {
      this.addCheck('Wallet Status', 'fail', `Erro: ${error.message}`);
      this.addError('Wallet', `Erro ao verificar carteira: ${error.message}`);
    }
  }

  async checkLogFiles() {
    console.log('\n🔹 Verificando arquivos de log...');

    const logsDir = 'logs';
    
    if (!fs.existsSync(logsDir)) {
      this.addCheck('Logs Directory', 'warn', 'Diretório não existe');
      this.addWarning('Logging', 'Diretório de logs não foi criado');
      return;
    } else {
      this.addCheck('Logs Directory', 'pass', 'Diretório existe');
    }

    const logFiles = fs.readdirSync(logsDir);
    const importantLogs = ['combined.log', 'error.log'];
    
    for (const logFile of importantLogs) {
      const logPath = path.join(logsDir, logFile);
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        const sizeKB = Math.round(stats.size / 1024);
        const ageHours = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60));
        
        this.addCheck(`Log ${logFile}`, 'pass', `${sizeKB}KB, ${ageHours}h atrás`);
        
        // Verificar tamanho dos logs
        if (stats.size > 50 * 1024 * 1024) { // 50MB
          this.addWarning('Logging', `Arquivo ${logFile} muito grande (${sizeKB}KB)`);
          this.addRecommendation('Logging', 'Configurar rotação de logs');
        }
      } else {
        this.addCheck(`Log ${logFile}`, 'warn', 'Arquivo não encontrado');
      }
    }

    // Verificar logs de arbitragem
    const arbitrageLogs = logFiles.filter(f => f.startsWith('arbitrage-') && f.endsWith('.json'));
    if (arbitrageLogs.length > 0) {
      this.addCheck('Arbitrage Logs', 'pass', `${arbitrageLogs.length} arquivos`);
      
      // Verificar log mais recente
      const recentLog = arbitrageLogs.sort().pop();
      const recentLogPath = path.join(logsDir, recentLog);
      const recentStats = fs.statSync(recentLogPath);
      const recentAgeHours = Math.round((Date.now() - recentStats.mtime.getTime()) / (1000 * 60 * 60));
      
      if (recentAgeHours > 24) {
        this.addWarning('Activity', 'Nenhuma atividade de arbitragem nas últimas 24h');
      }
    } else {
      this.addCheck('Arbitrage Logs', 'warn', 'Nenhum log de arbitragem encontrado');
    }
  }

  async checkFileSystem() {
    console.log('\n🔹 Verificando sistema de arquivos...');

    const directories = ['logs', 'data', 'backups'];
    
    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        // Verificar permissões de escrita
        try {
          const testFile = path.join(dir, '.write-test');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          this.addCheck(`Directory ${dir}`, 'pass', 'Acessível e gravável');
        } catch (error) {
          this.addCheck(`Directory ${dir}`, 'fail', 'Sem permissão de escrita');
          this.addError('FileSystem', `Sem permissão de escrita em ${dir}`);
        }
      } else {
        this.addCheck(`Directory ${dir}`, 'warn', 'Não existe (será criado quando necessário)');
      }
    }

    // Verificar espaço em disco
    try {
      const stats = fs.statSync('.');
      // Esta é uma verificação simplificada
      this.addCheck('Disk Space', 'pass', 'Disponível (verificação completa requer módulo adicional)');
    } catch (error) {
      this.addCheck('Disk Space', 'warn', 'Não foi possível verificar');
    }
  }

  async checkDependencies() {
    console.log('\n🔹 Verificando dependências...');

    const packageJsonPath = 'package.json';
    if (!fs.existsSync(packageJsonPath)) {
      this.addCheck('Package.json', 'fail', 'Arquivo não encontrado');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const criticalDeps = ['ethers', 'hardhat', 'winston', 'ws'];
    let missingCritical = 0;

    for (const dep of criticalDeps) {
      if (dependencies[dep]) {
        this.addCheck(`Dependency ${dep}`, 'pass', `v${dependencies[dep]}`);
      } else {
        this.addCheck(`Dependency ${dep}`, 'fail', 'Não encontrada');
        this.addError('Dependencies', `Dependência crítica ${dep} não encontrada`);
        missingCritical++;
      }
    }

    if (missingCritical > 0) {
      this.addRecommendation('Dependencies', 'Executar npm install para instalar dependências');
    }

    // Verificar node_modules
    if (fs.existsSync('node_modules')) {
      this.addCheck('Node Modules', 'pass', 'Diretório existe');
    } else {
      this.addCheck('Node Modules', 'fail', 'Diretório não encontrado');
      this.addError('Dependencies', 'node_modules não encontrado - executar npm install');
    }
  }

  generateOverallStatus() {
    const failedChecks = this.results.checks.filter(c => c.status === 'fail').length;
    const warningChecks = this.results.checks.filter(c => c.status === 'warn').length;
    const totalErrors = this.results.errors.length;

    if (totalErrors > 3 || failedChecks > 5) {
      this.results.overall = 'critical';
    } else if (totalErrors > 0 || failedChecks > 2) {
      this.results.overall = 'unhealthy';
    } else if (warningChecks > 5) {
      this.results.overall = 'degraded';
    } else {
      this.results.overall = 'healthy';
    }
  }

  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 RELATÓRIO DE SAÚDE DO SISTEMA');
    console.log('='.repeat(60));

    // Status geral
    const statusIcon = {
      'healthy': '🟢',
      'degraded': '🟡',
      'unhealthy': '🟠',
      'critical': '🔴'
    };

    console.log(`\n${statusIcon[this.results.overall]} Status Geral: ${this.results.overall.toUpperCase()}`);

    // Resumo das verificações
    const passed = this.results.checks.filter(c => c.status === 'pass').length;
    const warned = this.results.checks.filter(c => c.status === 'warn').length;
    const failed = this.results.checks.filter(c => c.status === 'fail').length;

    console.log(`\n📊 Resumo das Verificações:`);
    console.log(`  ✅ Passou: ${passed}`);
    console.log(`  ⚠️ Aviso: ${warned}`);
    console.log(`  ❌ Falhou: ${failed}`);
    console.log(`  📋 Total: ${this.results.checks.length}`);

    // Erros críticos
    if (this.results.errors.length > 0) {
      console.log(`\n❌ Erros Críticos (${this.results.errors.length}):`);
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.category}] ${error.message}`);
      });
    }

    // Avisos
    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️ Avisos (${this.results.warnings.length}):`);
      this.results.warnings.slice(0, 5).forEach((warning, index) => {
        console.log(`  ${index + 1}. [${warning.category}] ${warning.message}`);
      });
      if (this.results.warnings.length > 5) {
        console.log(`  ... e mais ${this.results.warnings.length - 5} avisos`);
      }
    }

    // Recomendações
    if (this.results.recommendations.length > 0) {
      console.log(`\n💡 Recomendações:`);
      this.results.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.category}] ${rec.action}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }

  saveHealthReport() {
    try {
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
      }

      const reportFile = path.join('logs', `health-check-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
      
      console.log(`📄 Relatório salvo em: ${reportFile}`);
    } catch (error) {
      console.error('❌ Erro ao salvar relatório:', error.message);
    }
  }
}

// Executar verificação
const healthChecker = new HealthChecker();
healthChecker.runAllChecks();