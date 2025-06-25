const { ethers } = require("hardhat");

// Endereços da Polygon Amoy (testnet)
const AMOY_ADDRESSES = {
  // Wrapped MATIC (WMATIC) - verificado
  WMATIC: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
  
  // Routers DEX (QuickSwap V2 na Amoy)
  QUICKSWAP_V2_ROUTER: "0x8954AfA98594b838bda56FE4C12a09D7739D179b",
  
  // Tokens de teste na Amoy
  USDC: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
  USDT: "0xc2c527c0cacf457746bd31b2a698fe89de2b6d49",
  WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
};

async function main() {
  console.log("🚀 Iniciando deploy do ArbitrageBotV2 (Robusto) na Polygon Amoy...");
  
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
    // Deploy do ArbitrageBotV2 (Robusto)
    console.log("📝 Deployando ArbitrageBotV2 (Robusto)...");
    
    const ArbitrageBotV2 = await ethers.getContractFactory("ArbitrageBotV2");
    
    const arbitrageBot = await ArbitrageBotV2.deploy(
      AMOY_ADDRESSES.WMATIC,  // WETH/WMATIC address
      deployer.address        // Owner
    );
    
    await arbitrageBot.waitForDeployment();
    const contractAddress = await arbitrageBot.getAddress();
    
    console.log("✅ ArbitrageBotV2 deployado em:", contractAddress);
    
    // Configurar o contrato
    console.log("⚙️ Configurando contrato...");
    
    // Autorizar routers
    await arbitrageBot.authorizeRouter(AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER, true);
    console.log("✅ QuickSwap V2 Router autorizado");
    
    // Autorizar caller (deployer)
    await arbitrageBot.authorizeCaller(deployer.address, true);
    console.log("✅ Caller autorizado");
    
    // Adicionar tokens suportados
    await arbitrageBot.setSupportedToken(AMOY_ADDRESSES.WMATIC, true);
    await arbitrageBot.setSupportedToken(AMOY_ADDRESSES.USDC, true);
    await arbitrageBot.setSupportedToken(AMOY_ADDRESSES.USDT, true);
    await arbitrageBot.setSupportedToken(AMOY_ADDRESSES.WETH, true);
    console.log("✅ Tokens suportados configurados");
    
    // Configurar parâmetros
    await arbitrageBot.updateConfig(
      50,    // 0.5% lucro mínimo
      200,   // 2% slippage máximo
      100000000000 // 100 gwei gas price máximo
    );
    console.log("✅ Parâmetros configurados");
    
    // Salvar informações do deploy
    saveDeployInfo(contractAddress, deployer.address, "ArbitrageBotV2", AMOY_ADDRESSES);
    
    // Exibir informações finais
    displaySuccessInfo(contractAddress, deployer.address);
    
  } catch (error) {
    console.error("❌ Erro no deploy:", error.message);
    process.exit(1);
  }
}

function saveDeployInfo(contractAddress, deployerAddress, contractType, addresses) {
  const deployInfo = {
    timestamp: new Date().toISOString(),
    network: "amoy",
    contractType: contractType,
    contractAddress: contractAddress,
    deployerAddress: deployerAddress,
    addresses: addresses,
    chainId: 80002
  };
  
  const fs = require("fs");
  fs.writeFileSync("deploy-amoy-v2-robust-info.json", JSON.stringify(deployInfo, null, 2));
  console.log("📄 Informações do deploy salvas em: deploy-amoy-v2-robust-info.json");
}

function displaySuccessInfo(contractAddress, deployerAddress) {
  console.log("\n🎉 Deploy concluído com sucesso!");
  console.log("============================================================");
  console.log("📊 INFORMAÇÕES DO CONTRATO:");
  console.log("📍 Endereço:", contractAddress);
  console.log("🌐 Network: Polygon Amoy (ChainID: 80002)");
  console.log("👤 Owner:", deployerAddress);
  console.log("🔧 Tipo: ArbitrageBotV2 (Robusto)");
  console.log("============================================================");
  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("1. Verificar o contrato no PolygonScan:");
  console.log("   https://amoy.polygonscan.com/address/" + contractAddress);
  console.log("2. Testar funções básicas do contrato");
  console.log("3. Configurar monitoramento de preços");
  console.log("4. Depositar tokens para arbitragem");
  console.log("\n💡 Para testar:");
  console.log("   npm run test:amoy:local");
  console.log("============================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 