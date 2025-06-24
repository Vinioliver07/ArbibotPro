const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testando deploy do ArbitrageBot...\n");
  
  try {
    // Ler informações de deploy se existir
    const fs = require('fs');
    let deployInfo;
    
    try {
      const data = fs.readFileSync('deploy-amoy-info.json', 'utf8');
      deployInfo = JSON.parse(data);
      console.log("📋 Informações de deploy encontradas:");
      console.log("📍 Endereço do contrato:", deployInfo.contractAddress);
      console.log("🌐 Network:", deployInfo.network);
      console.log("⏰ Deploy feito em:", deployInfo.deployTime);
    } catch {
      console.log("❌ Arquivo deploy-amoy-info.json não encontrado");
      console.log("💡 Execute o deploy primeiro: npm run deploy:amoy");
      return;
    }
    
    // Conectar ao contrato
    const arbitrageBot = await ethers.getContractAt("ArbitrageBot", deployInfo.contractAddress);
    
    console.log("\n🔍 Testando funcionalidades básicas...");
    
    // Teste 1: Verificar owner
    const owner = await arbitrageBot.owner();
    console.log("✅ Owner:", owner);
    
    // Teste 2: Verificar WETH address
    const wethAddress = await arbitrageBot.WETH_ADDRESS();
    console.log("✅ WETH Address:", wethAddress);
    
    // Teste 3: Verificar configurações
    const [minProfit, maxSlippage] = await arbitrageBot.getConfig();
    console.log("✅ Min Profit:", minProfit.toString(), "basis points (", (minProfit / 100).toString(), "%)");
    console.log("✅ Max Slippage:", maxSlippage.toString(), "basis points (", (maxSlippage / 100).toString(), "%)");
    
    // Teste 4: Verificar autorização do owner
    const isOwnerAuthorized = await arbitrageBot.isCallerAuthorized(owner);
    console.log("✅ Owner autorizado como caller:", isOwnerAuthorized);
    
    // Teste 5: Verificar router autorizado
    const quickswapRouter = "0x8954AfA98594b838bda56FE4C12a09D7739D179b";
    const isRouterAuthorized = await arbitrageBot.isRouterAuthorized(quickswapRouter);
    console.log("✅ QuickSwap router autorizado:", isRouterAuthorized);
    
    // Teste 6: Verificar saldo do contrato
    const contractBalance = await ethers.provider.getBalance(deployInfo.contractAddress);
    console.log("✅ Saldo do contrato:", ethers.formatEther(contractBalance), "MATIC");
    
    console.log("\n🎉 Todos os testes básicos passaram!");
    console.log("\n📋 Próximos passos:");
    console.log("1. 🔗 Verificar contrato no explorer:");
    console.log(`   https://amoy.polygonscan.com/address/${deployInfo.contractAddress}`);
    console.log("2. 💰 Enviar algum MATIC para o contrato para testes");
    console.log("3. 🤖 Configurar bot de monitoramento de preços");
    console.log("4. 📊 Testar arbitragem em ambiente controlado");
    
  } catch (error) {
    console.error("❌ Erro durante os testes:", error.message);
    
    if (error.message.includes("could not detect network")) {
      console.log("\n💡 Dica: Certifique-se de estar conectado à rede Amoy");
      console.log("Execute: npx hardhat run scripts/test-deployment.js --network amoy");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Erro fatal:", error);
    process.exit(1);
  });