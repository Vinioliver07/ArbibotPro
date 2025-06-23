// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Interfaces para Aave V3
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";

// Interfaces para Uniswap V2 Router
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

// Interfaces ERC20
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface WETH (para wrapping/unwrapping ETH)
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
}

contract FlashArbitrageBot {
    address public immutable owner;
    IPool public immutable aavePool;
    IUniswapV2Router02 public immutable uniswapRouterV2;
    address public immutable WETH_ADDRESS;

    // Eventos para monitoramento
    event ArbitrageExecuted(
        address indexed loanToken,
        uint256 loanAmount,
        uint256 profit,
        address indexed dex1Router,
        address indexed dex2Router
    );
    event ArbitrageFailed(
        address indexed loanToken,
        uint256 loanAmount,
        string reason
    );
    event TokensRecovered(address indexed token, uint256 amount);

    // Estrutura para os parâmetros de arbitragem que serão passados do off-chain
    struct ArbitrageData {
        address tokenA;          // Token a ser comprado na primeira perna (e.g., token emprestado)
        address tokenB;          // Token intermediário
        address dex1Router;      // Router da DEX para a primeira troca (TokenA -> TokenB)
        address dex2Router;      // Router da DEX para a segunda troca (TokenB -> TokenA)
        uint256 amountOutMinFinal; // Quantidade mínima do tokenA esperado de volta para cobrir loan + premium + lucro mínimo
    }

    constructor(
        address _aavePoolAddressesProvider,
        address _uniswapRouterV2,
        address _wethAddress
    ) {
        owner = msg.sender;
        IPoolAddressesProvider addressesProvider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        aavePool = IPool(addressesProvider.getPool());
        uniswapRouterV2 = IUniswapV2Router02(_uniswapRouterV2);
        WETH_ADDRESS = _wethAddress;
    }

    // Função de fallback para receber ETH (necessária se o Flash Loan for ETH e precisar de wrap, ou para receber lucro em ETH)
    receive() external payable {}

    // Função principal chamada pelo Aave Pool após conceder o Flash Loan
    function executeOperation(
        address asset,    // O token emprestado
        uint256 amount,   // A quantidade emprestada
        uint256 premium,  // A taxa do flash loan
        address initiator, // O endereço que iniciou o empréstimo (nosso contrato)
        bytes calldata params // Dados adicionais passados ao iniciar o empréstimo (ArbitrageData codificada)
    ) external returns (bool) {
        // Validar que a chamada veio do Pool Aave e foi iniciada por este contrato
        require(msg.sender == address(aavePool), "CALLER_MUST_BE_AAVE_POOL");
        require(initiator == address(this), "INITIATOR_MUST_BE_THIS_CONTRACT");

        // Decodificar os parâmetros da arbitragem
        ArbitrageData memory data = abi.decode(params, (ArbitrageData));

        // Garantir que temos o token emprestado (asset) e que ele é o esperado (data.tokenA)
        require(asset == data.tokenA, "LOAN_ASSET_MISMATCH");

        // ----- 1. EXECUTAR PRIMEIRA TROCA (TokenA -> TokenB) -----
        // Aprovar o roteador da DEX1 para gastar o 'asset' (TokenA) com aprovação máxima
        IERC20(asset).approve(data.dex1Router, type(uint256).max);

        address[] memory path1 = new address[](2);
        path1[0] = asset; // Token emprestado (TokenA)
        path1[1] = data.tokenB; // Token intermediário

        // Chamar o swap na DEX1. getAmountsOut simula a quantidade esperada.
        // É responsabilidade do bot off-chain garantir que 'amount' é suficiente para um lucro.
        uniswapRouterV2.swapExactTokensForTokens(
            amount,           // Quantidade exata de TokenA
            0,                // slippage mínimo (0 pois o foco é no slippage final)
            path1,
            address(this),    // O contrato recebe o TokenB
            block.timestamp   // Deadline
        );

        // ----- 2. EXECUTAR SEGUNDA TROCA (TokenB -> TokenA) -----
        // Obter o saldo atual de TokenB após a primeira troca
        uint256 balanceTokenB = IERC20(data.tokenB).balanceOf(address(this));
        require(balanceTokenB > 0, "NO_TOKEN_B_TO_SWAP_BACK");

        // Aprovar o roteador da DEX2 para gastar o TokenB com aprovação máxima
        IERC20(data.tokenB).approve(data.dex2Router, type(uint256).max);

        address[] memory path2 = new address[](2);
        path2[0] = data.tokenB;  // Token intermediário
        path2[1] = asset;        // Token original (TokenA) para pagar o empréstimo

        // Chamar o swap na DEX2 com o amountOutMinFinal do struct
        uniswapRouterV2.swapExactTokensForTokens(
            balanceTokenB,       // Quantidade exata de TokenB
            data.amountOutMinFinal, // Quantidade mínima de TokenA esperada (com slippage)
            path2,
            address(this),       // O contrato recebe o TokenA
            block.timestamp      // Deadline
        );

        // ----- 3. REEMBOLSAR FLASH LOAN E CALCULAR LUCRO -----
        uint256 finalAssetBalance = IERC20(asset).balanceOf(address(this));
        uint256 totalRepayAmount = amount + premium;

        // Verificar se há o suficiente para pagar o empréstimo e a taxa
        require(finalAssetBalance >= totalRepayAmount, "NOT_ENOUGH_TO_REPAY_LOAN_OR_NOT_PROFITABLE");

        // Aprovar o Pool Aave para puxar o token do empréstimo (aprovação específica para o valor do empréstimo)
        IERC20(asset).approve(address(aavePool), totalRepayAmount);

        // Calcular e transferir o lucro para o proprietário
        uint256 profit = finalAssetBalance - totalRepayAmount;
        if (profit > 0) {
            // Se o lucro for em WETH, desempacote para ETH e transfira ETH nativo
            if (asset == WETH_ADDRESS) {
                IWETH(WETH_ADDRESS).withdraw(profit); // Desempacotar WETH para ETH
                payable(owner).transfer(profit);
            } else {
                // Se o lucro for em outro token ERC20, transfira o token
                IERC20(asset).transfer(owner, profit);
            }
            emit ArbitrageExecuted(asset, amount, profit, data.dex1Router, data.dex2Router);
        } else {
            // Se a transação não reverteu mas não houve lucro (margem zero ou negativa)
            emit ArbitrageFailed(asset, amount, "No profit made after repaying loan but enough to repay");
        }

        return true; // Indica sucesso na operação
    }

    // Função para iniciar um flash loan. Chamada pelo bot off-chain.
    // O bot off-chain deve passar tokenA como o asset.
    function initiateFlashLoan(
        address _asset,              // Token a ser emprestado (ex: WETH)
        uint256 _amount,             // Quantidade do token a ser emprestado
        bytes calldata _arbitrageData // ArbitrageData struct codificado
    ) external onlyOwner {
        // _asset deve ser o mesmo que data.tokenA
        // Aave Pool chamará executeOperation neste contrato
        aavePool.flashLoan(
            address(this),       // Executor da operação (este contrato)
            _asset,              // Token a ser emprestado
            _amount,             // Quantidade
            _arbitrageData,      // Dados extras para a executeOperation
            0                    // Parâmetro `referralCode` (0 para nenhum)
        );
    }

    // Permite ao proprietário recuperar tokens acidentalmente enviados para o contrato.
    function recoverERC20(address _tokenAddress, uint256 _tokenAmount) external onlyOwner {
        IERC20(_tokenAddress).transfer(owner, _tokenAmount);
        emit TokensRecovered(_tokenAddress, _tokenAmount);
    }

    // Permite ao proprietário recuperar ETH acidentalmente enviado para o contrato.
    function recoverETH(uint256 _amount) external onlyOwner {
        payable(owner).transfer(_amount);
    }

    // Modificador para restringir acesso ao owner
    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER_ALLOWED");
        _;
    }
}
