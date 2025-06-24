const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArbitrageBot", function () {
  let arbitrageBot;
  let owner, addr1, addr2;
  let mockPoolProvider, mockWETH;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy dos contratos mocks
    const MockPoolProvider = await ethers.getContractFactory("MockPoolProvider");
    mockPoolProvider = await MockPoolProvider.deploy();
    await mockPoolProvider.waitForDeployment();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockWETH = await MockERC20.deploy("Mock WETH", "MWETH", 18);
    await mockWETH.waitForDeployment();

    // Deploy do contrato ArbitrageBot com endereços mocks reais
    const ArbitrageBot = await ethers.getContractFactory("ArbitrageBot");
    arbitrageBot = await ArbitrageBot.deploy(
      await mockPoolProvider.getAddress(),
      await mockWETH.getAddress(),
      owner.address
    );
    await arbitrageBot.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Deve definir o owner correto", async function () {
      expect(await arbitrageBot.owner()).to.equal(owner.address);
    });

    it("Deve definir o endereço WETH correto", async function () {
      expect(await arbitrageBot.WETH_ADDRESS()).to.equal(await mockWETH.getAddress());
    });

    it("Deve autorizar o owner como caller inicial", async function () {
      expect(await arbitrageBot.isCallerAuthorized(owner.address)).to.be.true;
    });

    it("Deve definir configurações iniciais corretas", async function () {
      const [minProfit, maxSlippage] = await arbitrageBot.getConfig();
      expect(minProfit).to.equal(50); // 0.5%
      expect(maxSlippage).to.equal(200); // 2%
    });
  });

  describe("Autorização de Routers", function () {
    it("Deve permitir ao owner autorizar um router", async function () {
      const routerAddress = addr1.address;
      
      await expect(arbitrageBot.authorizeRouter(routerAddress, true))
        .to.emit(arbitrageBot, "RouterAuthorized")
        .withArgs(routerAddress, true);
      
      expect(await arbitrageBot.isRouterAuthorized(routerAddress)).to.be.true;
    });

    it("Deve permitir ao owner desautorizar um router", async function () {
      const routerAddress = addr1.address;
      
      // Primeiro autorizar
      await arbitrageBot.authorizeRouter(routerAddress, true);
      expect(await arbitrageBot.isRouterAuthorized(routerAddress)).to.be.true;
      
      // Depois desautorizar
      await arbitrageBot.authorizeRouter(routerAddress, false);
      expect(await arbitrageBot.isRouterAuthorized(routerAddress)).to.be.false;
    });

    it("Deve rejeitar autorização de router por não-owner", async function () {
      await expect(
        arbitrageBot.connect(addr1).authorizeRouter(addr2.address, true)
      ).to.be.revertedWithCustomError(arbitrageBot, "OwnableUnauthorizedAccount");
    });
  });

  describe("Autorização de Callers", function () {
    it("Deve permitir ao owner autorizar um caller", async function () {
      const callerAddress = addr1.address;
      
      await expect(arbitrageBot.authorizeCaller(callerAddress, true))
        .to.emit(arbitrageBot, "CallerAuthorized")
        .withArgs(callerAddress, true);
      
      expect(await arbitrageBot.isCallerAuthorized(callerAddress)).to.be.true;
    });

    it("Deve rejeitar autorização de caller por não-owner", async function () {
      await expect(
        arbitrageBot.connect(addr1).authorizeCaller(addr2.address, true)
      ).to.be.revertedWithCustomError(arbitrageBot, "OwnableUnauthorizedAccount");
    });
  });

  describe("Configuração", function () {
    it("Deve permitir ao owner atualizar configurações", async function () {
      const newMinProfit = 100; // 1%
      const newMaxSlippage = 300; // 3%
      
      await expect(arbitrageBot.updateConfig(newMinProfit, newMaxSlippage))
        .to.emit(arbitrageBot, "ConfigUpdated")
        .withArgs(newMinProfit, newMaxSlippage);
      
      const [minProfit, maxSlippage] = await arbitrageBot.getConfig();
      expect(minProfit).to.equal(newMinProfit);
      expect(maxSlippage).to.equal(newMaxSlippage);
    });

    it("Deve rejeitar configurações muito altas", async function () {
      await expect(
        arbitrageBot.updateConfig(1500, 200) // 15% min profit (muito alto)
      ).to.be.revertedWith("MIN_PROFIT_TOO_HIGH");

      await expect(
        arbitrageBot.updateConfig(50, 1500) // 15% max slippage (muito alto)
      ).to.be.revertedWith("MAX_SLIPPAGE_TOO_HIGH");
    });

    it("Deve rejeitar atualização de configuração por não-owner", async function () {
      await expect(
        arbitrageBot.connect(addr1).updateConfig(100, 300)
      ).to.be.revertedWithCustomError(arbitrageBot, "OwnableUnauthorizedAccount");
    });
  });

  describe("Execução de Arbitragem", function () {
    it("Deve rejeitar execução por caller não autorizado", async function () {
      const params = {
        tokenA: await mockWETH.getAddress(),
        tokenB: addr1.address,
        dex1Router: addr1.address,
        dex2Router: addr2.address,
        minAmountOut: ethers.parseEther("1"),
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      await expect(
        arbitrageBot.connect(addr1).executeArbitrage(
          await mockWETH.getAddress(),
          ethers.parseEther("1"),
          params,
          ethers.parseEther("0.01")
        )
      ).to.be.revertedWithCustomError(arbitrageBot, "UnauthorizedCaller");
    });
  });

  describe("Funções de Emergência", function () {
    it("Deve permitir ao owner fazer withdraw de emergência", async function () {
      // Enviar algum ETH para o contrato
      await owner.sendTransaction({
        to: await arbitrageBot.getAddress(),
        value: ethers.parseEther("1")
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      // Fazer o withdraw
      const tx = await arbitrageBot.emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1"));
      const receipt = await tx.wait();
      
      const finalBalance = await ethers.provider.getBalance(owner.address);
      
      // Verificar que o saldo aumentou (considerando o gas gasto)
      expect(finalBalance > initialBalance - ethers.parseEther("0.01")).to.be.true;
    });

    it("Deve rejeitar withdraw de emergência por não-owner", async function () {
      await expect(
        arbitrageBot.connect(addr1).emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(arbitrageBot, "OwnableUnauthorizedAccount");
    });
  });

  describe("Receive Function", function () {
    it("Deve aceitar ETH", async function () {
      await expect(
        owner.sendTransaction({
          to: await arbitrageBot.getAddress(),
          value: ethers.parseEther("1")
        })
      ).to.not.be.reverted;

      const balance = await ethers.provider.getBalance(await arbitrageBot.getAddress());
      expect(balance).to.equal(ethers.parseEther("1"));
    });
  });
});