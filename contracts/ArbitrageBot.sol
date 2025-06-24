// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArbitrageBot
 * @dev Contrato otimizado para arbitragem usando flash loans da Aave V3
 * @notice Este contrato executa arbitragem entre diferentes DEXs usando flash loans
 */
contract ArbitrageBot is Ownable, ReentrancyGuard {
    // ============ Estado Imutável ============
    IPool public immutable aavePool;
    address public immutable WETH_ADDRESS;
    
    // ============ Estado Configurável ============
    mapping(address => bool) public authorizedRouters;
    mapping(address => bool) public authorizedCallers;
    uint256 public minProfitBasisPoints = 50; // 0.5% mínimo de lucro
    uint256 public maxSlippageBasisPoints = 200; // 2% slippage máximo
    
    // ============ Estruturas ============
    struct ArbitrageParams {
        address tokenA;
        address tokenB;
        address dex1Router;
        address dex2Router;
        uint256 minAmountOut;
        uint256 deadline;
    }
    
    struct FlashLoanParams {
        ArbitrageParams params;
        uint256 expectedProfit;
    }
    
    // ============ Eventos ============
    event ArbitrageExecuted(
        address indexed asset,
        uint256 amount,
        uint256 profit,
        address dex1,
        address dex2,
        uint256 gasUsed
    );
    
    event ArbitrageFailed(
        address indexed asset,
        uint256 amount,
        string reason
    );
    
    event RouterAuthorized(address indexed router, bool authorized);
    event CallerAuthorized(address indexed caller, bool authorized);
    event ProfitWithdrawn(address indexed token, uint256 amount);
    event ConfigUpdated(uint256 minProfit, uint256 maxSlippage);
    
    // ============ Erros Customizados ============
    error UnauthorizedCaller();
    error UnauthorizedRouter();
    error InvalidSlippage();
    error InsufficientProfit();
    error InvalidDeadline();
    error FlashLoanFailed();
    
    constructor(
        address _aavePoolAddressesProvider,
        address _wethAddress,
        address _owner
    ) Ownable(_owner) {
        IPoolAddressesProvider provider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        aavePool = IPool(provider.getPool());
        WETH_ADDRESS = _wethAddress;
        
        // Autorizar caller inicial
        authorizedCallers[_owner] = true;
        emit CallerAuthorized(_owner, true);
    }
    
    receive() external payable {}
    
    // ============ Modificadores ============
    modifier onlyAuthorizedCaller() {
        if (!authorizedCallers[msg.sender]) revert UnauthorizedCaller();
        _;
    }
    
    modifier validDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert InvalidDeadline();
        _;
    }
    
    // ============ Função Principal de Flash Loan ============
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(aavePool), "CALLER_MUST_BE_AAVE_POOL");
        require(initiator == address(this), "INVALID_INITIATOR");
        require(assets.length == 1, "SINGLE_ASSET_ONLY");
        
        address asset = assets[0];
        uint256 amount = amounts[0];
        uint256 premium = premiums[0];
        
        uint256 gasStart = gasleft();
        
        FlashLoanParams memory flashParams = abi.decode(params, (FlashLoanParams));
        ArbitrageParams memory arbParams = flashParams.params;
        
        // Validações
        if (!authorizedRouters[arbParams.dex1Router] || !authorizedRouters[arbParams.dex2Router]) {
            revert UnauthorizedRouter();
        }
        
        require(asset == arbParams.tokenA, "ASSET_MISMATCH");
        
        bool success = _executeArbitrage(asset, amount, arbParams);
        
        if (success) {
            uint256 totalOwed = amount + premium;
            uint256 balance = IERC20(asset).balanceOf(address(this));
            
            if (balance < totalOwed) {
                emit ArbitrageFailed(asset, amount, "INSUFFICIENT_BALANCE_TO_REPAY");
                return false;
            }
            
            // Aprovar pagamento do flash loan
            IERC20(asset).approve(address(aavePool), totalOwed);
            
            uint256 profit = balance - totalOwed;
            uint256 minExpectedProfit = (amount * minProfitBasisPoints) / 10000;
            
            if (profit < minExpectedProfit) {
                emit ArbitrageFailed(asset, amount, "PROFIT_BELOW_MINIMUM");
                return false;
            }
            
            uint256 gasUsed = gasStart - gasleft();
            emit ArbitrageExecuted(asset, amount, profit, arbParams.dex1Router, arbParams.dex2Router, gasUsed);
            
            return true;
        } else {
            emit ArbitrageFailed(asset, amount, "ARBITRAGE_EXECUTION_FAILED");
            return false;
        }
    }
    
    // ============ Execução da Arbitragem ============
    function _executeArbitrage(
        address asset,
        uint256 amount,
        ArbitrageParams memory params
    ) internal validDeadline(params.deadline) returns (bool) {
        try this._performSwaps(asset, amount, params) {
            return true;
        } catch {
            return false;
        }
    }
    
    function _performSwaps(
        address asset,
        uint256 amount,
        ArbitrageParams memory params
    ) external {
        require(msg.sender == address(this), "INTERNAL_ONLY");
        
        // Primeira troca: asset -> tokenB
        IERC20(asset).approve(params.dex1Router, amount);
        
        address[] memory path1 = new address[](2);
        path1[0] = asset;
        path1[1] = params.tokenB;
        
        uint256[] memory amounts1 = IUniswapV2Router02(params.dex1Router)
            .swapExactTokensForTokens(
                amount,
                0, // Permitir qualquer quantidade (controle será na segunda troca)
                path1,
                address(this),
                params.deadline
            );
        
        uint256 tokenBAmount = amounts1[1];
        
        // Segunda troca: tokenB -> asset
        IERC20(params.tokenB).approve(params.dex2Router, tokenBAmount);
        
        address[] memory path2 = new address[](2);
        path2[0] = params.tokenB;
        path2[1] = asset;
        
        IUniswapV2Router02(params.dex2Router).swapExactTokensForTokens(
            tokenBAmount,
            params.minAmountOut,
            path2,
            address(this),
            params.deadline
        );
    }
    
    // ============ Função de Entrada para Arbitragem ============
    function executeArbitrage(
        address asset,
        uint256 amount,
        ArbitrageParams calldata params,
        uint256 expectedProfit
    ) external onlyAuthorizedCaller nonReentrant {
        FlashLoanParams memory flashParams = FlashLoanParams({
            params: params,
            expectedProfit: expectedProfit
        });
        
        bytes memory data = abi.encode(flashParams);
        
        address[] memory assets = new address[](1);
        assets[0] = asset;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // 0 = no debt (flash loan)
        
        aavePool.flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            data,
            0
        );
    }
    
    // ============ Funções Administrativas ============
    function authorizeRouter(address router, bool authorized) external onlyOwner {
        authorizedRouters[router] = authorized;
        emit RouterAuthorized(router, authorized);
    }
    
    function authorizeCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized);
    }
    
    function updateConfig(
        uint256 _minProfitBasisPoints,
        uint256 _maxSlippageBasisPoints
    ) external onlyOwner {
        require(_minProfitBasisPoints <= 1000, "MIN_PROFIT_TOO_HIGH"); // Max 10%
        require(_maxSlippageBasisPoints <= 1000, "MAX_SLIPPAGE_TOO_HIGH"); // Max 10%
        
        minProfitBasisPoints = _minProfitBasisPoints;
        maxSlippageBasisPoints = _maxSlippageBasisPoints;
        
        emit ConfigUpdated(_minProfitBasisPoints, _maxSlippageBasisPoints);
    }
    
    // ============ Funções de Recuperação ============
    function withdrawProfits(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner(), balance);
            emit ProfitWithdrawn(token, balance);
        }
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
            emit ProfitWithdrawn(address(0), balance);
        }
    }
    
    // ============ Funções de Emergência ============
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
    
    // ============ Views ============
    function isRouterAuthorized(address router) external view returns (bool) {
        return authorizedRouters[router];
    }
    
    function isCallerAuthorized(address caller) external view returns (bool) {
        return authorizedCallers[caller];
    }
    
    function getConfig() external view returns (uint256, uint256) {
        return (minProfitBasisPoints, maxSlippageBasisPoints);
    }
}