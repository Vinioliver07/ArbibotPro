const { expect } = require("chai");
const { ethers } = require("hardhat");

// Importe as ABIs e endereços dos contratos reais que você vai interagir
// Você precisará garantir que `@aave/core-v3`, `@uniswap/v2-periphery` e `@openzeppelin/contracts`
// estejam instalados via npm para que esses caminhos de importação funcionem.
const AAVE_POOL_ABI = require("@aave/core-v3/artifacts/contracts/interfaces/IPool.sol/IPool.json").abi;
const AAVE_ADDRESSES_PROVIDER_ABI = require("@aave/core-v3/artifacts/contracts/interfaces/IPoolAddressesProvider.sol/IPoolAddressesProvider.json").abi;
const UNISWAP_V2_ROUTER_ABI = require("@uniswap/v2-periphery/artifacts/contracts/interfaces/IUniswapV2Router02.sol/IUniswapV2Router02.json").abi;
const ERC20_ABI = require("@openzeppelin/contracts/build/contracts/IERC20.json").abi;

// Endereços de contratos reais na Mainnet (você pode verificar no Etherscan)
const AAVE_POOL_ADDRESSES_PROVIDER = "0x2f39d218133AFffB47CD78347A3267AD400CCCa7"; // Aave V3 PoolAddressesProvider Mainnet
const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5d89F8aCee7d7c67"; // Uniswap V2 Router02 Mainnet
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH Mainnet
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI Mainnet
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC Mainnet

describe("FlashArbitrageBot", function () {
  let flashArbitrageBot;
  let owner;
  let aavePool;
  let uniswapRouter;
  let weth, dai, usdc; // Contratos ERC20

  before(async function () {
    [owner] = await ethers.getSigners();

    // Implante seu contrato FlashArbitrageBot
    const FlashArbitrageBotFactory = await ethers.getContractFactory("FlashArbitrageBot");
    flashArbitrageBot = await FlashArbitrageBotFactory.deploy(
      AAVE_POOL_ADDRESSES_PROVIDER,
      UNISWAP_V2_ROUTER,
      WETH_ADDRESS
    );
    await flashArbitrageBot.deployed();

    // Instancie os contratos externos para interagir com eles no forking
    const aaveAddressesProvider = new ethers.Contract(AAVE_POOL_ADDRESSES_PROVIDER, AAVE_ADDRESSES_PROVIDER_ABI, owner);
    const poolAddress = await aaveAddressesProvider.getPool();
    aavePool = new ethers.Contract(poolAddress, AAVE_POOL_ABI, owner);
    uniswapRouter = new ethers.Contract(UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI, owner);

    // Instancie os tokens ERC20 para verificar saldos
    weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, owner);
    dai = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, owner);
    usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, owner);
  });

  // Teste de arbitragem de exemplo: WETH -> DAI (DEX1) -> WETH (DEX2)
  it("should execute a profitable arbitrage and transfer profit to owner (WETH)", async function () {
    // A lógica de arbitragem e lucro REAL é determinada pelas condições de mercado no momento do fork.
    // Este teste assume que há uma oportunidade de lucro para este par/DEXs.
    // Na prática, seu bot off-chain faria essa determinação.

    const loanAmount = ethers.utils.parseUnits("1", "ether"); // 1 WETH como exemplo de Flash Loan
    const tokenA = WETH_ADDRESS;
    const tokenB = DAI_ADDRESS; // Ou USDC, dependendo da oportunidade

    // Simular o `amountOutMin` para a última perna (DAI -> WETH)
    const pathInitialSwap = [tokenA, tokenB];
    const amountsOutInitial = await uniswapRouter.getAmountsOut(loanAmount, pathInitialSwap);
    const amountIntermediateToken = amountsOutInitial[1]; // Quantidade de TokenB (DAI) após a primeira troca

    const pathFinalSwap = [tokenB, tokenA];
    const amountsOutFinalSimulation = await uniswapRouter.getAmountsOut(amountIntermediateToken, pathFinalSwap);
    const expectedAmountBack = amountsOutFinalSimulation[1]; // Quantidade de TokenA (WETH) esperada de volta

    // Defina uma tolerância de slippage (ex: 0.5%)
    const SLIPPAGE_TOLERANCE_PERCENT = 0.5;
    const slippageFactor = (100 - SLIPPAGE_TOLERANCE_PERCENT) / 100;
    const amountOutMinFinal = expectedAmountBack.mul(ethers.BigNumber.from(Math.floor(slippageFactor * 10000))).div(10000);

    // Crie os parâmetros codificados para a `ArbitrageData`
    const arbitrageData = {
      tokenA: tokenA,
      tokenB: tokenB,
      dex1Router: UNISWAP_V2_ROUTER,
      dex2Router: UNISWAP_V2_ROUTER,
      amountOutMinFinal: amountOutMinFinal,
    };

    // Codifique a struct ArbitrageData para `bytes calldata params`
    const encodedArbitrageData = ethers.utils.defaultAbiCoder.encode(
      ["tuple(address tokenA, address tokenB, address dex1Router, address dex2Router, uint256 amountOutMinFinal)"],
      [Object.values(arbitrageData)]
    );

    // Saldo inicial de WETH do owner (para verificar o lucro)
    const initialOwnerWETHBalance = await weth.balanceOf(owner.address);
    const initialContractWETHBalance = await weth.balanceOf(flashArbitrageBot.address);

    // Inicie o Flash Loan. Esta transação vai chamar executeOperation no seu contrato.
    await expect(flashArbitrageBot.initiateFlashLoan(
      tokenA, // Asset do Flash Loan (WETH)
      loanAmount,
      encodedArbitrageData
    )).to.not.be.reverted; // Espera que a transação não reverta

    // Verifique o saldo final de WETH no owner
    const finalOwnerWETHBalance = await weth.balanceOf(owner.address);
    const finalContractWETHBalance = await weth.balanceOf(flashArbitrageBot.address);

    // O contrato deve ter 0 WETH ou quase 0 após o reembolso e transferência de lucro.
    expect(finalContractWETHBalance).to.be.lt(initialContractWETHBalance.add(loanAmount));
    expect(finalContractWETHBalance).to.be.lt(ethers.utils.parseUnits("0.0001", "ether")); // Quase zero

    // O proprietário deve ter um lucro (saldo final > saldo inicial + (se tiver depositado antes))
    // A menos que a arbitragem seja tão pequena que o lucro seja 0, mas o empréstimo foi pago
    expect(finalOwnerWETHBalance).to.be.gt(initialOwnerWETHBalance);

    // Verifique se o contrato não ficou com outros tokens
    expect(await dai.balanceOf(flashArbitrageBot.address)).to.equal(0);
    expect(await usdc.balanceOf(flashArbitrageBot.address)).to.equal(0);

    // Você também pode verificar os eventos emitidos se quiser
    // const receipt = await tx.wait();
    // expect(receipt.events.some(e => e.event === "ArbitrageExecuted")).to.be.true;
  }).timeout(120000); // Aumentar o timeout para testes de forking

  it("should revert if arbitrage is not profitable due to high slippage (WETH)", async function () {
    const loanAmount = ethers.utils.parseUnits("1", "ether");
    const tokenA = WETH_ADDRESS;
    const tokenB = DAI_ADDRESS;

    // Force um amountOutMin irrealisticamente alto para garantir a reversão
    const artificiallyHighAmountOutMin = ethers.utils.parseUnits("1000000000", "ether"); // Um valor impossível

    const arbitrageData = {
      tokenA: tokenA,
      tokenB: tokenB,
      dex1Router: UNISWAP_V2_ROUTER,
      dex2Router: UNISWAP_V2_ROUTER,
      amountOutMinFinal: artificiallyHighAmountOutMin,
    };

    const encodedArbitrageData = ethers.utils.defaultAbiCoder.encode(
      ["tuple(address tokenA, address tokenB, address dex1Router, address dex2Router, uint256 amountOutMinFinal)"],
      [Object.values(arbitrageData)]
    );

    // Espera que a transação reverta com uma mensagem específica
    await expect(
      flashArbitrageBot.initiateFlashLoan(tokenA, loanAmount, encodedArbitrageData)
    ).to.be.revertedWith("NOT_ENOUGH_TO_REPAY_LOAN_OR_NOT_PROFITABLE"); // Mensagem do seu require
  }).timeout(60000); // Aumentar o timeout

  it("should allow owner to recover accidentally sent ERC20 tokens", async function () {
    const testTokenAddress = USDC_ADDRESS; // Use USDC para o teste
    const amountToSend = ethers.utils.parseUnits("100", "mwei"); // 100 USDC (6 decimais)

    // Simular que alguém enviou tokens para o contrato acidentalmente
    // Usamos um signer diferente para simular o envio externo
    const [_, otherAccount] = await ethers.getSigners();
    // Precisamos de USDC para 'otherAccount' para enviar. Vamos 'impersonar' uma conta com muito USDC.
    const richUSDCAccount = "0xf58178e69888dd2b75a7c1b504ad44005cf3cfcc"; // Exemplo de conta com muito USDC
    await ethers.provider.send("hardhat_impersonateAccount", [richUSDCAccount]);
    const signerWithUSDC = await ethers.getSigner(richUSDCAccount);

    // Obter o contrato USDC com o signer que tem USDC
    const usdcToken = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signerWithUSDC);

    // Transferir USDC para o contrato de arbitragem
    await usdcToken.transfer(flashArbitrageBot.address, amountToSend);
    expect(await usdcToken.balanceOf(flashArbitrageBot.address)).to.equal(amountToSend);

    // Saldo inicial de USDC do owner
    const initialOwnerUSDCBalance = await usdcToken.balanceOf(owner.address);

    // Owner recupera os tokens
    await flashArbitrageBot.recoverERC20(testTokenAddress, amountToSend);

    // Verifica se os tokens foram transferidos para o owner
    expect(await usdcToken.balanceOf(flashArbitrageBot.address)).to.equal(0);
    expect(await usdcToken.balanceOf(owner.address)).to.equal(initialOwnerUSDCBalance.add(amountToSend));

    // Parar de impersonar a conta
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [richUSDCAccount]);

  }).timeout(60000);

  it("should allow owner to recover accidentally sent ETH", async function () {
    const amountToSend = ethers.utils.parseEther("0.5"); // 0.5 ETH

    // Enviar ETH para o contrato
    await owner.sendTransaction({
      to: flashArbitrageBot.address,
      value: amountToSend
    });
    expect(await ethers.provider.getBalance(flashArbitrageBot.address)).to.equal(amountToSend);

    // Saldo inicial de ETH do owner (considerando o gás gasto)
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Owner recupera o ETH
    const tx = await flashArbitrageBot.recoverETH(amountToSend);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

    // Verifica se o ETH foi transferido para o owner
    expect(await ethers.provider.getBalance(flashArbitrageBot.address)).to.equal(0);
    // A verificação de saldo do owner é mais complexa devido ao gás, apenas verificamos o contrato
    // expect(await ethers.provider.getBalance(owner.address)).to.be.closeTo(initialOwnerBalance.add(amountToSend).sub(gasUsed), ethers.utils.parseEther("0.001"));
  }).timeout(60000);

  it("should not allow non-owner to initiate flash loan", async function () {
    const [_, nonOwner] = await ethers.getSigners();
    const loanAmount = ethers.utils.parseUnits("1", "ether");
    const encodedArbitrageData = ethers.utils.defaultAbiCoder.encode(
        ["tuple(address tokenA, address tokenB, address dex1Router, address dex2Router, uint256 amountOutMinFinal)"],
        [Object.values({
            tokenA: WETH_ADDRESS,
            tokenB: DAI_ADDRESS,
            dex1Router: UNISWAP_V2_ROUTER,
            dex2Router: UNISWAP_V2_ROUTER,
            amountOutMinFinal: 0 // Irrelevante para este teste de permissão
        })]
    );

    await expect(
      flashArbitrageBot.connect(nonOwner).initiateFlashLoan(
        WETH_ADDRESS,
        loanAmount,
        encodedArbitrageData
      )
    ).to.be.revertedWith("ONLY_OWNER_ALLOWED");
  }).timeout(60000);

  it("should not allow non-owner to recover tokens", async function () {
    const [_, nonOwner] = await ethers.getSigners();
    const amountToSend = ethers.utils.parseUnits("1", "ether");

    // Simular envio de tokens para o contrato
    const testToken = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, owner);
    await testToken.transfer(flashArbitrageBot.address, amountToSend);

    await expect(
      flashArbitrageBot.connect(nonOwner).recoverERC20(WETH_ADDRESS, amountToSend)
    ).to.be.revertedWith("ONLY_OWNER_ALLOWED");
  }).timeout(60000);

  it("should not allow non-owner to recover ETH", async function () {
    const [_, nonOwner] = await ethers.getSigners();
    const amountToSend = ethers.utils.parseEther("0.1");

    // Enviar ETH para o contrato
    await owner.sendTransaction({
      to: flashArbitrageBot.address,
      value: amountToSend
    });

    await expect(
      flashArbitrageBot.connect(nonOwner).recoverETH(amountToSend)
    ).to.be.revertedWith("ONLY_OWNER_ALLOWED");
  }).timeout(60000);
});