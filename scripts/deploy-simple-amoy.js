const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploy do SimpleArbitrageBot na Polygon Amoy...");
  
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
    // Deploy do SimpleArbitrageBot
    console.log("📝 Deployando SimpleArbitrageBot...");
    
    const SimpleArbitrageBot = await ethers.getContractFactory("SimpleArbitrageBot");
    
    const arbitrageBot = await SimpleArbitrageBot.deploy(deployer.address);

    console.log("⏳ Aguardando confirmação...");
    await arbitrageBot.waitForDeployment();
    
    const contractAddress = await arbitrageBot.getAddress();
    console.log("✅ SimpleArbitrageBot deployed para:", contractAddress);
    
    // Testar funções básicas
    console.log("🧪 Testando funções básicas...");
    
    const owner = await arbitrageBot.owner();
    console.log("   Owner:", owner);
    
    const isCallerAuthorized = await arbitrageBot.authorizedCallers(deployer.address);
    console.log("   Caller autorizado:", isCallerAuthorized);
    
    const minProfit = await arbitrageBot.minProfitBasisPoints();
    console.log("   Min Profit (basis points):", minProfit.toString());
    
    // Configurar router de teste
    console.log("🔧 Configurando router de teste...");
    const testRouter = "0x8954AfA98594b838bda56FE4C12a09D7739D179b"; // QuickSwap V2
    
    const tx1 = await arbitrageBot.authorizeRouter(testRouter, true);
    await tx1.wait();
    console.log("✅ Router autorizado:", testRouter);
    
    // Testar autorização do router
    const isRouterAuthorized = await arbitrageBot.authorizedRouters(testRouter);
    console.log("   Router autorizado:", isRouterAuthorized);
    
    console.log("\n🎉 Deploy bem-sucedido!");
    console.log("📍 Contrato:", contractAddress);
    console.log("🌐 Network: Polygon Amoy (ChainID: 80002)");
    console.log("👤 Owner:", deployer.address);
    
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
      
      // Atualizar ou adicionar ARBITRAGE_BOT_ADDRESS
      if (envContent.includes('ARBITRAGE_BOT_ADDRESS=')) {
        envContent = envContent.replace(
          /ARBITRAGE_BOT_ADDRESS=.*/,
          `ARBITRAGE_BOT_ADDRESS=${contractAddress}`
        );
      } else {
        envContent += `\nARBITRAGE_BOT_ADDRESS=${contractAddress}`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log("💾 Endereço salvo no .env");
    }
    
    // Salvar informações de deploy
    const deployInfo = {
      network: "amoy",
      contractAddress: contractAddress,
      deployer: deployer.address,
      deployTime: new Date().toISOString(),
      txHash: arbitrageBot.deploymentTransaction().hash,
      contractType: "SimpleArbitrageBot"
    };
    
    fs.writeFileSync(
      'deploy-simple-amoy-info.json', 
      JSON.stringify(deployInfo, null, 2)
    );
    console.log("💾 Informações de deploy salvas em: deploy-simple-amoy-info.json");
    
    console.log("\n📋 PRÓXIMOS PASSOS:");
    console.log("1. Verificar o contrato no PolygonScan:");
    console.log(`   https://amoy.polygonscan.com/address/${contractAddress}`);
    console.log("2. Testar o bot com: npm run test:amoy:local");
    console.log("3. Configurar monitoramento de preços");
    
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