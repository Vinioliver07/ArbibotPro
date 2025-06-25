const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploy simplificado na Polygon Amoy...");
  
  // Obter signers
  const [deployer] = await ethers.getSigners();
  
  console.log("📧 Deploying com a conta:", deployer.address);
  console.log("💰 Saldo da conta:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "MATIC");
  
  // Verificar saldo
  const balance = await deployer.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.01")) {
    console.error("❌ Saldo insuficiente!");
    process.exit(1);
  }
  
  try {
    // Primeiro, vamos tentar deployar um contrato mais simples para testar
    console.log("📝 Testando deploy de MockERC20...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    const mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
    await mockToken.waitForDeployment();
    
    const mockAddress = await mockToken.getAddress();
    console.log("✅ MockERC20 deployed para:", mockAddress);
    
    // Agora tentar o ArbitrageBot
    console.log("📝 Deployando ArbitrageBot...");
    
    // Endereços básicos para teste
    const testAddresses = {
      aaveProvider: "0x5343b5bA672Ae99d627A1C87866b8E53F47Db2E6", // Aave V3 Provider
      wmatic: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9", // WMATIC
      owner: deployer.address
    };
    
    console.log("🔧 Parâmetros de deploy:");
    console.log("   Aave Provider:", testAddresses.aaveProvider);
    console.log("   WMATIC:", testAddresses.wmatic);
    console.log("   Owner:", testAddresses.owner);
    
    const ArbitrageBot = await ethers.getContractFactory("ArbitrageBot");
    
    const arbitrageBot = await ArbitrageBot.deploy(
      testAddresses.aaveProvider,
      testAddresses.wmatic,
      testAddresses.owner
    );

    console.log("⏳ Aguardando confirmação...");
    await arbitrageBot.waitForDeployment();
    
    const contractAddress = await arbitrageBot.getAddress();
    console.log("✅ ArbitrageBot deployed para:", contractAddress);
    
    // Testar funções básicas
    console.log("🧪 Testando funções básicas...");
    
    const owner = await arbitrageBot.owner();
    console.log("   Owner:", owner);
    
    const aavePool = await arbitrageBot.aavePool();
    console.log("   Aave Pool:", aavePool);
    
    const wmaticAddress = await arbitrageBot.WETH_ADDRESS();
    console.log("   WMATIC Address:", wmaticAddress);
    
    console.log("\n🎉 Deploy bem-sucedido!");
    console.log("📍 Contrato:", contractAddress);
    
    // Salvar endereço no .env
    const fs = require('fs');
    const envPath = '.env';
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Atualizar ou adicionar AMOY_ARBITRAGE_BOT_ADDRESS
      if (envContent.includes('AMOY_ARBITRAGE_BOT_ADDRESS=')) {
        envContent = envContent.replace(
          /AMOY_ARBITRAGE_BOT_ADDRESS=.*/,
          `AMOY_ARBITRAGE_BOT_ADDRESS=${contractAddress}`
        );
      } else {
        envContent += `\nAMOY_ARBITRAGE_BOT_ADDRESS=${contractAddress}`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log("💾 Endereço salvo no .env");
    }
    
  } catch (error) {
    console.error("❌ Erro durante o deploy:", error.message);
    
    // Log detalhado do erro
    if (error.reason) {
      console.error("   Razão:", error.reason);
    }
    if (error.code) {
      console.error("   Código:", error.code);
    }
    if (error.transaction) {
      console.error("   Transaction:", error.transaction);
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Erro fatal:", error);
    process.exit(1);
  }); 