const fs = require("fs");
const path = require("path");
const readline = require("readline");

class BotSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.log("🚀 Configuração do ArbiBot Pro");
    console.log("================================\n");

    try {
      // Verificar se .env existe
      const envPath = path.join(__dirname, "..", ".env");
      const envExists = fs.existsSync(envPath);

      if (envExists) {
        console.log("📄 Arquivo .env encontrado");
        const backup = await this.askQuestion("Deseja fazer backup do arquivo atual? (y/n): ");
        if (backup.toLowerCase() === 'y') {
          const backupPath = `${envPath}.backup.${Date.now()}`;
          fs.copyFileSync(envPath, backupPath);
          console.log(`✅ Backup criado: ${backupPath}`);
        }
      }

      // Coletar configurações
      const config = await this.collectConfiguration();

      // Criar arquivo .env
      await this.createEnvFile(config);

      // Verificar dependências
      await this.checkDependencies();

      // Testar configuração
      await this.testConfiguration();

      console.log("\n🎉 Configuração concluída com sucesso!");
      console.log("\n📋 Próximos passos:");
      console.log("1. Execute: npm run bot:test");
      console.log("2. Se todos os testes passarem: npm run bot:start");
      console.log("3. Para monitorar logs: npm run bot:logs");

    } catch (error) {
      console.error("❌ Erro na configuração:", error.message);
    } finally {
      this.rl.close();
    }
  }

  async collectConfiguration() {
    console.log("🔧 Configuração do Bot\n");

    const config = {};

    // Chave privada
    config.PRIVATE_KEY = await this.askQuestion(
      "🔑 Digite sua chave privada (sem 0x): ",
      true
    );

    // Endereço do contrato
    config.AMOY_ARBITRAGE_BOT_ADDRESS = await this.askQuestion(
      "📄 Endereço do contrato ArbitrageBotV2: "
    );

    // RPC URL
    config.AMOY_RPC_URL = await this.askQuestion(
      "🌐 URL do RPC (Enter para usar padrão): ",
      false,
      "https://rpc-amoy.polygon.technology"
    );

    // Configurações de execução
    console.log("\n⚡ Configurações de Execução:");
    config.MIN_PROFIT_ETH = await this.askQuestion(
      "💰 Lucro mínimo em ETH (Enter para 0.001): ",
      false,
      "0.001"
    );

    config.CHECK_INTERVAL = await this.askQuestion(
      "⏱️ Intervalo de verificação em ms (Enter para 5000): ",
      false,
      "5000"
    );

    config.MAX_GAS_PRICE = await this.askQuestion(
      "⛽ Gas price máximo em gwei (Enter para 100): ",
      false,
      "100"
    );

    config.MAX_SLIPPAGE = await this.askQuestion(
      "📉 Slippage máximo em % (Enter para 0.5): ",
      false,
      "0.5"
    );

    // Configurações de log
    console.log("\n📝 Configurações de Log:");
    config.LOG_LEVEL = await this.askQuestion(
      "📊 Nível de log (debug/info/warn/error, Enter para info): ",
      false,
      "info"
    );

    config.LOG_TO_FILE = await this.askQuestion(
      "💾 Salvar logs em arquivo? (y/n, Enter para y): ",
      false,
      "y"
    );

    config.LOG_TO_CONSOLE = await this.askQuestion(
      "🖥️ Mostrar logs no console? (y/n, Enter para y): ",
      false,
      "y"
    );

    // Configurações opcionais
    console.log("\n🔧 Configurações Opcionais:");
    config.POLYGONSCAN_API_KEY = await this.askQuestion(
      "🔍 PolygonScan API Key (opcional): ",
      false,
      ""
    );

    config.ALERT_WEBHOOK = await this.askQuestion(
      "🔔 Webhook para alertas (opcional): ",
      false,
      ""
    );

    return config;
  }

  async createEnvFile(config) {
    console.log("\n📄 Criando arquivo .env...");

    const envContent = `# ===== CONFIGURAÇÃO ARBIBOT PRO =====

# 🔑 CHAVE PRIVADA (OBRIGATÓRIO)
PRIVATE_KEY=${config.PRIVATE_KEY}

# 🌐 CONFIGURAÇÃO DE REDE (OBRIGATÓRIO)
AMOY_RPC_URL=${config.AMOY_RPC_URL}

# 📋 ENDEREÇOS DOS CONTRATOS
AMOY_ARBITRAGE_BOT_ADDRESS=${config.AMOY_ARBITRAGE_BOT_ADDRESS}

# ⚡ CONFIGURAÇÕES DE PERFORMANCE
MIN_PROFIT_ETH=${config.MIN_PROFIT_ETH}
CHECK_INTERVAL=${config.CHECK_INTERVAL}
MAX_GAS_PRICE=${config.MAX_GAS_PRICE}
MAX_SLIPPAGE=${config.MAX_SLIPPAGE}

# 📝 CONFIGURAÇÕES DE LOG
LOG_LEVEL=${config.LOG_LEVEL}
LOG_TO_FILE=${config.LOG_TO_FILE === 'y' ? 'true' : 'false'}
LOG_TO_CONSOLE=${config.LOG_TO_CONSOLE === 'y' ? 'true' : 'false'}

# 🔧 CONFIGURAÇÕES AVANÇADAS
RPC_TIMEOUT=10000
MAX_RECONNECT_ATTEMPTS=10
GAS_LIMIT_MULTIPLIER=1.2
GAS_PRICE_MULTIPLIER=1.1
CACHE_DURATION=10000
PRICE_CACHE_DURATION=5000
GAS_CACHE_DURATION=15000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
MONITORING_ENABLED=true
METRICS_ENABLED=true
BACKUP_ENABLED=true
BACKUP_INTERVAL=3600000
ALERTS_ENABLED=${config.ALERT_WEBHOOK ? 'true' : 'false'}
ALERT_WEBHOOK=${config.ALERT_WEBHOOK}
NODE_ENV=production
DEBUG=false

# 🔍 CONFIGURAÇÕES OPCIONAIS
POLYGONSCAN_API_KEY=${config.POLYGONSCAN_API_KEY}
`;

    const envPath = path.join(__dirname, "..", ".env");
    fs.writeFileSync(envPath, envContent);

    console.log("✅ Arquivo .env criado com sucesso");
  }

  async checkDependencies() {
    console.log("\n📦 Verificando dependências...");

    const requiredDeps = [
      "ethers",
      "dotenv",
      "winston",
      "ws"
    ];

    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    const missing = [];
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      console.log(`⚠️ Dependências faltando: ${missing.join(", ")}`);
      const install = await this.askQuestion("Deseja instalar as dependências faltando? (y/n): ");
      if (install.toLowerCase() === 'y') {
        console.log("📦 Instalando dependências...");
        const { execSync } = require("child_process");
        execSync(`npm install ${missing.join(" ")}`, { stdio: "inherit" });
      }
    } else {
      console.log("✅ Todas as dependências estão instaladas");
    }
  }

  async testConfiguration() {
    console.log("\n🧪 Testando configuração...");

    try {
      const { BotIntegrationTester } = require("./test-bot-integration.js");
      const tester = new BotIntegrationTester();
      
      const success = await tester.runTests();
      
      if (success) {
        console.log("✅ Configuração testada com sucesso!");
      } else {
        console.log("⚠️ Alguns testes falharam. Verifique as configurações.");
      }
    } catch (error) {
      console.log("⚠️ Erro ao testar configuração:", error.message);
    }
  }

  askQuestion(question, required = false, defaultValue = "") {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question} `;
      
      this.rl.question(prompt, (answer) => {
        const value = answer.trim() || defaultValue;
        
        if (required && !value) {
          console.log("❌ Este campo é obrigatório!");
          this.askQuestion(question, required, defaultValue).then(resolve);
        } else {
          resolve(value);
        }
      });
    });
  }
}

// Função principal
async function main() {
  const setup = new BotSetup();
  await setup.run();
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { BotSetup }; 