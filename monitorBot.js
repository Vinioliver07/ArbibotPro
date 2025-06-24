require('dotenv').config();
const { ethers, JsonRpcProvider, WebSocketProvider } = require("ethers");

// ============ CONFIGURAÇÃO ============
const ROUTERS = {
    quickswap: "0x8954AfA98594b838bda56FE4C12a09D7739D179b",
    // Adicione mais routers conforme necessário
};

const TOKENS = {
    WMATIC: "0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9",
    USDC: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
    WETH: "0x...", // Substitua pelo endereço real
    USDT: "0x...",
    WBTC: "0x...",
};

const TOKEN_DECIMALS = {
    [TOKENS.WMATIC]: 18,
    [TOKENS.USDC]: 6,
    [TOKENS.WETH]: 18,
    [TOKENS.USDT]: 6,
    [TOKENS.WBTC]: 8,
};

const routerAbi = [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
];

const ARBITRAGE_PATHS = [
    {
        name: "WMATIC_USDC_WETH_WMATIC",
        routers: [ROUTERS.quickswap, ROUTERS.quickswap, ROUTERS.quickswap],
        tokens: [TOKENS.WMATIC, TOKENS.USDC, TOKENS.WETH, TOKENS.WMATIC],
    },
    // Adicione outros caminhos conforme necessário
];

const FLASH_LOAN_AMOUNT_IN = ethers.parseUnits("1000", 18);
const MIN_PROFIT_BPS = 50;
const MAX_SLIPPAGE_BPS = 200;

const httpProvider = new JsonRpcProvider(process.env.AMOY_RPC_URL);
let wsProvider = new WebSocketProvider(process.env.AMOY_WS_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, httpProvider);
const ARBITRAGE_BOT_ADDRESS = process.env.ARBITRAGE_BOT_CONTRACT_ADDRESS;

async function main() {
    console.log("Iniciando o bot de arbitragem off-chain...");
    const ArbitrageBotABI = require("./artifacts/contracts/ArbitrageBot.sol/ArbitrageBot.json").abi;
    const arbitrageBotContract = new ethers.Contract(ARBITRAGE_BOT_ADDRESS, ArbitrageBotABI, wallet);
    listenForSwapEvents(arbitrageBotContract);
    setInterval(() => checkForArbitrage(arbitrageBotContract), 10000);
}

async function simulateArbitrage(path, amountIn) {
    let currentAmount = amountIn;
    let amountsOut = [];
    try {
        const router1 = new ethers.Contract(path.routers[0], routerAbi, httpProvider);
        amountsOut = await router1.getAmountsOut(currentAmount, [path.tokens[0], path.tokens[1]]);
        currentAmount = amountsOut[1];
        const router2 = new ethers.Contract(path.routers[1], routerAbi, httpProvider);
        amountsOut = await router2.getAmountsOut(currentAmount, [path.tokens[1], path.tokens[2]]);
        currentAmount = amountsOut[1];
        const router3 = new ethers.Contract(path.routers[2], routerAbi, httpProvider);
        amountsOut = await router3.getAmountsOut(currentAmount, [path.tokens[2], path.tokens[3]]);
        currentAmount = amountsOut[1];
        const aaveFee = (amountIn * 9n) / 10000n;
        const gasPriceGwei = await httpProvider.getGasPrice();
        const estimatedGasLimit = 400000n;
        const gasCost = gasPriceGwei * estimatedGasLimit;
        const grossProfit = currentAmount - amountIn;
        const netProfit = grossProfit - aaveFee - gasCost;
        const expectedFinalAmount = amountsOut[1];
        const minAmountOutFinal = (expectedFinalAmount * (10000n - BigInt(MAX_SLIPPAGE_BPS))) / 10000n;
        return { profit: netProfit, minAmountOutFinal, totalGasCost: gasCost };
    } catch (error) {
        return { profit: 0n, minAmountOutFinal: 0n, totalGasCost: 0n };
    }
}

async function checkForArbitrage(arbitrageBotContract) {
    console.log(`[${new Date().toLocaleTimeString()}] Verificando oportunidades...`);
    for (const path of ARBITRAGE_PATHS) {
        const { profit, minAmountOutFinal, totalGasCost } = await simulateArbitrage(path, FLASH_LOAN_AMOUNT_IN);
        if (profit > 0n) {
            const tokenA = path.tokens[0];
            const profitInTokenA = ethers.formatUnits(profit, TOKEN_DECIMALS[tokenA]);
            console.log(`\n*** Oportunidade Encontrada! ***`);
            console.log(`Caminho: ${path.name}`);
            console.log(`Lucro Líquido Estimado: ${profitInTokenA} ${Object.keys(TOKENS).find(key => TOKENS[key] === tokenA)}`);
            console.log(`Min. Saída Final para o Contrato: ${ethers.formatUnits(minAmountOutFinal, TOKEN_DECIMALS[tokenA])}`);
            try {
                const params = {
                    tokenA: path.tokens[0],
                    tokenB: path.tokens[1],
                    tokenC: path.tokens[2],
                    router1: path.routers[0],
                    router2: path.routers[1],
                    router3: path.routers[2],
                    minAmountOutFinal: minAmountOutFinal,
                    deadline: Math.floor(Date.now() / 1000) + 60,
                };
                const gasEstimate = await arbitrageBotContract.executeArbitrage.estimateGas(
                    tokenA,
                    FLASH_LOAN_AMOUNT_IN,
                    params,
                    MIN_PROFIT_BPS
                );
                console.log(`Custo de Gás Estimado para a transação: ${gasEstimate.toString()} gas units`);
                const tx = await arbitrageBotContract.executeArbitrage(
                    tokenA,
                    FLASH_LOAN_AMOUNT_IN,
                    params,
                    MIN_PROFIT_BPS,
                    { gasLimit: gasEstimate }
                );
                console.log(`Transação de arbitragem enviada! Hash: ${tx.hash}`);
                console.log("Aguardando confirmação...");
                await tx.wait();
                console.log("Transação confirmada com sucesso!");
            } catch (error) {
                console.error("❌ Erro ao enviar a transação para o smart contract:", error);
            }
        }
    }
}

function listenForSwapEvents(arbitrageBotContract) {
    console.log("Iniciando monitoramento de eventos de swap via WebSocket...");
    for (const routerName in ROUTERS) {
        const routerAddress = ROUTERS[routerName];
        let routerContract = new ethers.Contract(routerAddress, routerAbi, wsProvider);
        routerContract.on("Swap", (...args) => {
            console.log(`\n>>> Evento Swap detectado no router ${routerName}! Acionando verificação de arbitragem...`);
            checkForArbitrage(arbitrageBotContract);
        });
    }
    wsProvider.on("error", (error) => {
        console.error("Erro no WebSocket, tentando reconectar...", error);
        reconnectWebSocket(arbitrageBotContract);
    });
    wsProvider._websocket?.on("close", () => {
        console.warn("WebSocket desconectado. Tentando reconectar...");
        reconnectWebSocket(arbitrageBotContract);
    });
}

function reconnectWebSocket(arbitrageBotContract) {
    try {
        wsProvider.destroy();
    } catch {}
    setTimeout(() => {
        wsProvider = new WebSocketProvider(process.env.AMOY_WS_URL);
        listenForSwapEvents(arbitrageBotContract);
    }, 5000);
}

// Placeholder para integração com oráculo de preço externo
function getPriceInUSD(tokenAddress) {
    if (tokenAddress === TOKENS.WMATIC) return 0.6;
    if (tokenAddress === TOKENS.USDC) return 1.0;
    if (tokenAddress === TOKENS.WETH) return 3500.0;
    return 0;
}

main().catch(console.error); 