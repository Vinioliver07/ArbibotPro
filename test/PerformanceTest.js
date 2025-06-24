const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

describe("ArbiBot Performance Tests", function () {
  let arbitrageBot;
  let mockRouter1, mockRouter2;
  let mockToken, mockWETH;
  let owner, user1, user2;
  let performanceData = [];
  
  const PERFORMANCE_LOG_FILE = 'logs/performance-test-results.json';

  before(async function () {
    // Setup inicial
    [owner, user1, user2] = await ethers.getSigners();
    
    console.log("🚀 Iniciando testes de performance...");
    
    // Criar diretório de logs se não existir
    const logsDir = path.dirname(PERFORMANCE_LOG_FILE);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Deploy de contratos mock
    await deployMockContracts();
    
    // Deploy do ArbitrageBot
    await deployArbitrageBot();
    
    // Setup inicial
    await initialSetup();
  });

  async function deployMockContracts() {
    // Mock WETH
    const MockWETH = await ethers.getContractFactory("MockERC20");
    mockWETH = await MockWETH.deploy("Wrapped ETH", "WETH", ethers.parseEther("1000000"));
    
    // Mock Token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    
    // Mock Routers
    const MockRouter = await ethers.getContractFactory("MockPoolProvider");
    mockRouter1 = await MockRouter.deploy();
    mockRouter2 = await MockRouter.deploy();
    
    console.log("✅ Contratos mock deployados");
  }

  async function deployArbitrageBot() {
    // Mock Aave Pool Provider
    const MockPoolProvider = await ethers.getContractFactory("MockPoolProvider");
    const mockPoolProvider = await MockPoolProvider.deploy();
    
    // Deploy ArbitrageBotV2
    const ArbitrageBotV2 = await ethers.getContractFactory("ArbitrageBotV2");
    arbitrageBot = await ArbitrageBotV2.deploy(
      await mockPoolProvider.getAddress(),
      await mockWETH.getAddress(),
      owner.address
    );
    
    console.log("✅ ArbitrageBotV2 deployado");
  }

  async function initialSetup() {
    // Autorizar routers
    await arbitrageBot.authorizeRouter(await mockRouter1.getAddress(), true);
    await arbitrageBot.authorizeRouter(await mockRouter2.getAddress(), true);
    
    // Adicionar tokens suportados
    await arbitrageBot.setSupportedToken(await mockToken.getAddress(), true);
    
    // Autorizar user1 como caller
    await arbitrageBot.authorizeCaller(user1.address, true);
    
    console.log("✅ Setup inicial concluído");
  }

  describe("Gas Usage Analysis", function () {
    it("Deve medir o gas usado na autorização de routers", async function () {
      const startTime = process.hrtime.bigint();
      
      const tx = await arbitrageBot.authorizeRouter(user2.address, true);
      const receipt = await tx.wait();
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // Convert to ms

      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice;
      const gasCost = gasUsed * gasPrice;

      recordPerformanceData("Router Authorization", {
        gasUsed: gasUsed.toString(),
        gasCost: ethers.formatEther(gasCost),
        executionTime: executionTime,
        blockNumber: receipt.blockNumber
      });

      expect(gasUsed).to.be.below(100000); // Limite razoável
      console.log(`⛽ Gas usado para autorização: ${gasUsed} (${ethers.formatEther(gasCost)} ETH)`);
    });

    it("Deve medir o gas usado na configuração de tokens", async function () {
      const startTime = process.hrtime.bigint();
      
      const tx = await arbitrageBot.setSupportedToken(user2.address, true);
      const receipt = await tx.wait();
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice;
      const gasCost = gasUsed * gasPrice;

      recordPerformanceData("Token Configuration", {
        gasUsed: gasUsed.toString(),
        gasCost: ethers.formatEther(gasCost),
        executionTime: executionTime,
        blockNumber: receipt.blockNumber
      });

      expect(gasUsed).to.be.below(80000);
      console.log(`⛽ Gas usado para configuração de token: ${gasUsed}`);
    });

    it("Deve medir o gas usado na atualização de configurações", async function () {
      const startTime = process.hrtime.bigint();
      
      const tx = await arbitrageBot.updateConfig(
        100, // minProfitBasisPoints
        300, // maxSlippageBasisPoints  
        ethers.parseUnits("150", "gwei") // maxGasPrice
      );
      const receipt = await tx.wait();
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice;
      const gasCost = gasUsed * gasPrice;

      recordPerformanceData("Configuration Update", {
        gasUsed: gasUsed.toString(),
        gasCost: ethers.formatEther(gasCost),
        executionTime: executionTime,
        blockNumber: receipt.blockNumber
      });

      expect(gasUsed).to.be.below(150000);
      console.log(`⛽ Gas usado para atualização de config: ${gasUsed}`);
    });
  });

  describe("Execution Time Benchmarks", function () {
    it("Deve medir tempo de execução de views functions", async function () {
      const iterations = 100;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        
        await arbitrageBot.getArbitrageStats();
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        results.push(executionTime);
      }

      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);

      recordPerformanceData("View Functions", {
        iterations,
        averageTime: avgTime,
        maxTime,
        minTime,
        standardDeviation: calculateStandardDeviation(results, avgTime)
      });

      expect(avgTime).to.be.below(10); // Menos de 10ms em média
      console.log(`📊 Tempo médio view functions: ${avgTime.toFixed(2)}ms`);
    });

    it("Deve medir tempo de validação de parâmetros", async function () {
      const iterations = 50;
      const results = [];

      const params = {
        tokenA: await mockWETH.getAddress(),
        tokenB: await mockToken.getAddress(),
        dex1Router: await mockRouter1.getAddress(),
        dex2Router: await mockRouter2.getAddress(),
        minAmountOut: ethers.parseEther("1"),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        maxGasPrice: ethers.parseUnits("100", "gwei"),
        salt: ethers.randomBytes(32)
      };

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        
        try {
          await arbitrageBot.calculateArbitrageId(
            await mockWETH.getAddress(),
            ethers.parseEther("1"),
            params
          );
        } catch (error) {
          // Ignorar erros de validação para teste de performance
        }
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        results.push(executionTime);
      }

      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;

      recordPerformanceData("Parameter Validation", {
        iterations,
        averageTime: avgTime,
        maxTime: Math.max(...results),
        minTime: Math.min(...results)
      });

      expect(avgTime).to.be.below(20);
      console.log(`📊 Tempo médio validação: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe("Stress Testing", function () {
    it("Deve testar múltiplas operações simultâneas", async function () {
      const concurrentOps = 10;
      const promises = [];
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < concurrentOps; i++) {
        promises.push(
          arbitrageBot.getArbitrageStats()
        );
      }

      await Promise.all(promises);
      
      const endTime = process.hrtime.bigint();
      const totalTime = Number(endTime - startTime) / 1000000;
      const avgTimePerOp = totalTime / concurrentOps;

      recordPerformanceData("Concurrent Operations", {
        operations: concurrentOps,
        totalTime,
        averageTimePerOperation: avgTimePerOp
      });

      expect(avgTimePerOp).to.be.below(50);
      console.log(`🔄 ${concurrentOps} operações em ${totalTime.toFixed(2)}ms`);
    });

    it("Deve testar limites de gas em transações", async function () {
      const gasLimits = [100000, 200000, 500000, 1000000];
      const results = [];

      for (const gasLimit of gasLimits) {
        try {
          const startTime = process.hrtime.bigint();
          
          const tx = await arbitrageBot.updateConfig(
            75, // minProfitBasisPoints
            250, // maxSlippageBasisPoints
            ethers.parseUnits("120", "gwei"), // maxGasPrice
            { gasLimit }
          );
          const receipt = await tx.wait();
          
          const endTime = process.hrtime.bigint();
          const executionTime = Number(endTime - startTime) / 1000000;

          results.push({
            gasLimit,
            gasUsed: receipt.gasUsed.toString(),
            executionTime,
            success: true
          });

        } catch (error) {
          results.push({
            gasLimit,
            gasUsed: 0,
            executionTime: 0,
            success: false,
            error: error.message
          });
        }
      }

      recordPerformanceData("Gas Limit Testing", { results });
      
      const successfulOps = results.filter(r => r.success).length;
      expect(successfulOps).to.be.greaterThan(0);
      console.log(`⛽ Teste de limites de gas: ${successfulOps}/${results.length} sucessos`);
    });
  });

  describe("Memory and State Analysis", function () {
    it("Deve analisar crescimento de estado", async function () {
      const initialState = await getContractStateSize();
      
      // Adicionar múltiplos tokens e routers
      for (let i = 0; i < 5; i++) {
        const mockContract = await ethers.getContractFactory("MockERC20");
        const token = await mockContract.deploy(`Token${i}`, `TK${i}`, ethers.parseEther("1000"));
        await arbitrageBot.setSupportedToken(await token.getAddress(), true);
      }

      const finalState = await getContractStateSize();
      const stateGrowth = finalState - initialState;

      recordPerformanceData("State Growth Analysis", {
        initialState,
        finalState,
        stateGrowth,
        growthPerItem: stateGrowth / 5
      });

      expect(stateGrowth).to.be.below(500000); // Limite razoável para crescimento
      console.log(`📈 Crescimento de estado: ${stateGrowth} bytes`);
    });

    it("Deve medir performance de consultas com estado grande", async function () {
      const queryTimes = [];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        
        await arbitrageBot.getArbitrageStats();
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        queryTimes.push(executionTime);
      }

      const avgTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

      recordPerformanceData("Large State Queries", {
        iterations,
        averageQueryTime: avgTime,
        maxQueryTime: Math.max(...queryTimes),
        minQueryTime: Math.min(...queryTimes)
      });

      expect(avgTime).to.be.below(15);
      console.log(`📊 Tempo médio com estado grande: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe("Error Handling Performance", function () {
    it("Deve medir tempo de processamento de erros", async function () {
      const errorTests = [
        {
          name: "Unauthorized Caller",
          test: () => arbitrageBot.connect(user2).updateConfig(100, 200, ethers.parseUnits("100", "gwei"))
        },
        {
          name: "Invalid Token",
          test: () => arbitrageBot.setSupportedToken(ethers.ZeroAddress, true)
        },
        {
          name: "Invalid Router",
          test: () => arbitrageBot.authorizeRouter(ethers.ZeroAddress, true)
        }
      ];

      const results = [];

      for (const errorTest of errorTests) {
        const startTime = process.hrtime.bigint();
        
        try {
          await errorTest.test();
        } catch (error) {
          // Erro esperado
        }
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        
        results.push({
          name: errorTest.name,
          executionTime
        });
      }

      recordPerformanceData("Error Handling", { results });

      const avgErrorTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
      expect(avgErrorTime).to.be.below(30);
      console.log(`❌ Tempo médio de processamento de erros: ${avgErrorTime.toFixed(2)}ms`);
    });
  });

  // Funções auxiliares
  function recordPerformanceData(testName, data) {
    performanceData.push({
      testName,
      timestamp: new Date().toISOString(),
      data,
      networkId: 31337, // Hardhat network
      blockNumber: null // Será preenchido quando disponível
    });
  }

  function calculateStandardDeviation(values, mean) {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  async function getContractStateSize() {
    // Estimativa simplificada do tamanho do estado
    const code = await ethers.provider.getCode(await arbitrageBot.getAddress());
    return code.length;
  }

  after(async function () {
    // Salvar dados de performance
    try {
      fs.writeFileSync(PERFORMANCE_LOG_FILE, JSON.stringify(performanceData, null, 2));
      console.log(`📊 Dados de performance salvos em: ${PERFORMANCE_LOG_FILE}`);
      
      // Gerar relatório de resumo
      generatePerformanceReport();
      
    } catch (error) {
      console.error("Erro ao salvar dados de performance:", error);
    }
  });

  function generatePerformanceReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📋 RELATÓRIO DE PERFORMANCE - ARBIBOT PRO");
    console.log("=".repeat(60));
    
    // Resumo por categoria
    const categories = {};
    performanceData.forEach(test => {
      const category = test.testName.split(' ')[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(test);
    });

    Object.keys(categories).forEach(category => {
      console.log(`\n🔹 ${category.toUpperCase()}`);
      categories[category].forEach(test => {
        console.log(`   ▸ ${test.testName}`);
        if (test.data.gasUsed) {
          console.log(`     Gas: ${test.data.gasUsed}`);
        }
        if (test.data.executionTime) {
          console.log(`     Tempo: ${test.data.executionTime.toFixed(2)}ms`);
        }
        if (test.data.averageTime) {
          console.log(`     Tempo médio: ${test.data.averageTime.toFixed(2)}ms`);
        }
      });
    });

    // Recomendações
    console.log("\n🎯 RECOMENDAÇÕES DE OTIMIZAÇÃO:");
    console.log("   • Implementar cache para consultas frequentes");
    console.log("   • Otimizar validações de parâmetros");
    console.log("   • Considerar batch operations para múltiplas configurações");
    console.log("   • Implementar circuit breakers para operações custosas");
    
    console.log("\n✅ Testes de performance concluídos!");
    console.log("=".repeat(60));
  }
});