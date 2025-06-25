const { ethers } = require("hardhat");

// Endereços da Polygon Amoy (testnet)
const AMOY_ADDRESSES = {
  // Aave V3 Pool Address Provider
  AAVE_POOL_ADDRESSES_PROVIDER: "0x5343b5bA672Ae99d627A1C87866b8E53F47Db2E6",
  
  // Wrapped MATIC (WMATIC)
  WMATIC: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
  
  // Routers DEX (QuickSwap V2 na Amoy)
  QUICKSWAP_V2_ROUTER: "0x8954AfA98594b838bda56FE4C12a09D7739D179b",
  
  // Tokens de teste na Amoy
  USDC: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
  USDT: "0xc2c527c0cacf457746bd31b2a698fe89de2b6d49",
  WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH wrapped
};

async function main() {
  console.log("🚀 Iniciando deploy do ArbitrageBotV2 na Polygon Amoy...");
  
  // Obter signers
  const [deployer] = await ethers.getSigners();
  
  console.log("📧 Deploying com a conta:", deployer.address);
  console.log("💰 Saldo da conta:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "MATIC");
  
  // Verificar se há saldo suficiente (mínimo 0.1 MATIC)
  const balance = await deployer.provider.getBalance(deployer.address);
  const minBalance = ethers.parseEther("0.1");
  
  if (balance < minBalance) {
    console.error("❌ Saldo insuficiente! Mínimo necessário: 0.1 MATIC");
    console.log("💡 Obtenha MATIC de teste no faucet: https://faucet.polygon.technology/");
    process.exit(1);
  }
  
  try {
    // Deploy do contrato ArbitrageBotV2
    console.log("📝 Compilando contrato...");
    const ArbitrageBotV2 = await ethers.getContractFactory("ArbitrageBotV2");
    
    console.log("🔄 Fazendo deploy...");
    console.log("🔧 Parâmetros de deploy:");
    console.log("   Aave Provider:", AMOY_ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER);
    console.log("   WMATIC:", AMOY_ADDRESSES.WMATIC);
    console.log("   Owner:", deployer.address);
    
    const arbitrageBot = await ArbitrageBotV2.deploy(
      AMOY_ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER,
      AMOY_ADDRESSES.WMATIC,
      deployer.address
    );

    console.log("⏳ Aguardando confirmação...");
    await arbitrageBot.waitForDeployment();
    
    const contractAddress = await arbitrageBot.getAddress();
    console.log("✅ ArbitrageBotV2 deployed para:", contractAddress);
    
    // Configurar routers autorizados
    console.log("🔧 Configurando routers autorizados...");
    
    const tx1 = await arbitrageBot.authorizeRouter(AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER, true);
    await tx1.wait();
    console.log("✅ QuickSwap V2 Router autorizado");
    
    // Autorizar caller (deployer)
    const tx2 = await arbitrageBot.authorizeCaller(deployer.address, true);
    await tx2.wait();
    console.log("✅ Caller autorizado");
    
    // Configurar tokens suportados
    console.log("🔧 Configurando tokens suportados...");
    
    const tx3 = await arbitrageBot.setSupportedToken(AMOY_ADDRESSES.WMATIC, true);
    await tx3.wait();
    console.log("✅ WMATIC adicionado como token suportado");
    
    const tx4 = await arbitrageBot.setSupportedToken(AMOY_ADDRESSES.USDC, true);
    await tx4.wait();
    console.log("✅ USDC adicionado como token suportado");
    
    const tx5 = await arbitrageBot.setSupportedToken(AMOY_ADDRESSES.WETH, true);
    await tx5.wait();
    console.log("✅ WETH adicionado como token suportado");
    
    // Configurar parâmetros iniciais
    const tx6 = await arbitrageBot.updateConfig(50, 200, ethers.parseUnits("100", "gwei")); // 0.5% min profit, 2% max slippage, 100 gwei max gas
    await tx6.wait();
    console.log("✅ Configuração inicial definida");
    
    console.log("\n🎉 Deploy concluído com sucesso!");
    console.log("=" .repeat(60));
    console.log("📊 INFORMAÇÕES DO CONTRATO:");
    console.log("📍 Endereço:", contractAddress);
    console.log("🌐 Network:", "Polygon Amoy (ChainID: 80002)");
    console.log("👤 Owner:", deployer.address);
    console.log("🔗 Aave Pool Provider:", AMOY_ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER);
    console.log("💎 WMATIC:", AMOY_ADDRESSES.WMATIC);
    console.log("🔄 QuickSwap Router:", AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER);
    console.log("=" .repeat(60));
    
    console.log("\n📋 PRÓXIMOS PASSOS:");
    console.log("1. Verificar o contrato no PolygonScan:");
    console.log(`   https://amoy.polygonscan.com/address/${contractAddress}`);
    console.log("2. Testar o bot com: npm run test:amoy:local");
    console.log("3. Configurar monitoramento de preços");
    console.log("4. Executar health check: npm run health:check");
    
    // Salvar informações de deploy
    const deployInfo = {
      network: "amoy",
      contractAddress: contractAddress,
      deployer: deployer.address,
      deployTime: new Date().toISOString(),
      txHash: arbitrageBot.deploymentTransaction().hash,
      contractType: "ArbitrageBotV2",
      addresses: AMOY_ADDRESSES,
      configuration: {
        minProfitBasisPoints: 50,
        maxSlippageBasisPoints: 200,
        maxGasPrice: "100 gwei",
        authorizedRouters: [AMOY_ADDRESSES.QUICKSWAP_V2_ROUTER],
        supportedTokens: [AMOY_ADDRESSES.WMATIC, AMOY_ADDRESSES.USDC, AMOY_ADDRESSES.WETH]
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      'deploy-amoy-v2-info.json', 
      JSON.stringify(deployInfo, null, 2)
    );
    console.log("💾 Informações de deploy salvas em: deploy-amoy-v2-info.json");
    
    // Atualizar arquivo .env
    if (fs.existsSync('.env')) {
      let envContent = fs.readFileSync('.env', 'utf8');
      
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
      
      // Adicionar RPC_URL_PRIMARY se não existir
      if (!envContent.includes('RPC_URL_PRIMARY=')) {
        envContent += `\nRPC_URL_PRIMARY=https://rpc-amoy.polygon.technology`;
      }
      
      fs.writeFileSync('.env', envContent);
      console.log("💾 Arquivo .env atualizado");
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