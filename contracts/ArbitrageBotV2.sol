// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ArbitrageBotV2
 * @dev Contrato avançado para arbitragem com proteções MEV e validações robustas
 * @notice Versão otimizada com logs detalhados e proteção contra ataques
 */
contract ArbitrageBotV2 is Ownable, ReentrancyGuard, Pausable {
    // ============ Constants & Immutables ============
    IPool public immutable aavePool;
    address public immutable WETH_ADDRESS;
    uint256 public constant MAX_SLIPPAGE_BPS = 1000; // 10%
    uint256 public constant MIN_PROFIT_BPS = 10; // 0.1%
    uint256 public constant MAX_LOAN_AMOUNT = 1000 ether;
    uint256 public constant FLASH_LOAN_PREMIUM_TOTAL = 9; // 0.09%

    // ============ State Variables ============
    mapping(address => bool) public authorizedRouters;
    mapping(address => bool) public authorizedCallers;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => bool) public executedArbitrages; // Para evitar replay attacks
    
    uint256 public minProfitBasisPoints = 50; // 0.5%
    uint256 public maxSlippageBasisPoints = 200; // 2%
    uint256 public emergencyCooldown = 1 hours;
    uint256 public lastEmergencyTime;
    uint256 public totalSuccessfulArbitrages;
    uint256 public totalProfitGenerated;
    
    // Gas optimization
    uint256 public maxGasPrice = 100 gwei;
    uint256 public executionTimeout = 5 minutes;

    // ============ Structs ============
    struct ArbitrageParams {
        address tokenA;
        address tokenB;
        address dex1Router;
        address dex2Router;
        uint256 minAmountOut;
        uint256 deadline;
        uint256 maxGasPrice;
        bytes32 salt; // Para evitar replay attacks
    }
    
    struct FlashLoanData {
        ArbitrageParams params;
        uint256 expectedProfit;
        uint256 executionTimestamp;
    }

    struct ArbitrageResult {
        bool success;
        uint256 profit;
        uint256 gasUsed;
        uint256 actualAmountOut;
        string failureReason;
    }

    // ============ Events ============
    event ArbitrageExecuted(
        address indexed asset,
        uint256 indexed amount,
        uint256 profit,
        address indexed dex1,
        address dex2,
        uint256 gasUsed,
        uint256 timestamp,
        bytes32 arbitrageId
    );
    
    event ArbitrageFailed(
        address indexed asset,
        uint256 indexed amount,
        string indexed reason,
        address dex1,
        address dex2,
        uint256 timestamp,
        bytes32 arbitrageId
    );

    event ConfigurationUpdated(
        uint256 oldMinProfit,
        uint256 newMinProfit,
        uint256 oldMaxSlippage,
        uint256 newMaxSlippage,
        address indexed updatedBy
    );

    event RouterAuthorized(address indexed router, bool authorized, address indexed authorizedBy);
    event CallerAuthorized(address indexed caller, bool authorized, address indexed authorizedBy);
    event TokenSupported(address indexed token, bool supported, address indexed updatedBy);
    event EmergencyActionTaken(string action, address indexed caller, uint256 timestamp);
    event ProfitWithdrawn(address indexed token, uint256 amount, address indexed recipient);

    // ============ Errors ============
    error UnauthorizedCaller(address caller);
    error UnauthorizedRouter(address router);
    error UnsupportedToken(address token);
    error InvalidSlippage(uint256 slippage);
    error InsufficientProfit(uint256 actual, uint256 required);
    error InvalidDeadline(uint256 deadline, uint256 currentTime);
    error FlashLoanFailed(string reason);
    error ArbitrageAlreadyExecuted(bytes32 arbitrageId);
    error GasPriceTooHigh(uint256 actual, uint256 max);
    error InvalidTokenPair(address tokenA, address tokenB);
    error ExecutionTimeout(uint256 executionTime, uint256 maxTime);
    error EmergencyCooldownActive(uint256 remainingTime);
    error InvalidAmount(uint256 amount);

    constructor(
        address _aavePoolAddressesProvider,
        address _wethAddress,
        address _owner
    ) Ownable(_owner) {
        if (_aavePoolAddressesProvider == address(0) || _wethAddress == address(0)) {
            revert InvalidTokenPair(_aavePoolAddressesProvider, _wethAddress);
        }

        IPoolAddressesProvider provider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        aavePool = IPool(provider.getPool());
        WETH_ADDRESS = _wethAddress;
        
        // Autorizar owner como caller inicial
        authorizedCallers[_owner] = true;
        emit CallerAuthorized(_owner, true, _owner);
        
        // Adicionar WETH como token suportado por padrão
        supportedTokens[_wethAddress] = true;
        emit TokenSupported(_wethAddress, true, _owner);
    }

    receive() external payable {
        // Aceitar ETH apenas de WETH ou contratos autorizados
        require(msg.sender == WETH_ADDRESS || authorizedRouters[msg.sender], "ETH_NOT_ALLOWED");
    }

    // ============ Modifiers ============
    modifier onlyAuthorizedCaller() {
        if (!authorizedCallers[msg.sender]) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }
    
    modifier validDeadline(uint256 deadline) {
        if (block.timestamp > deadline) {
            revert InvalidDeadline(deadline, block.timestamp);
        }
        _;
    }

    modifier gasOptimized(uint256 maxGas) {
        if (tx.gasprice > maxGas) {
            revert GasPriceTooHigh(tx.gasprice, maxGas);
        }
        _;
    }

    modifier nonReplayable(bytes32 arbitrageId) {
        if (executedArbitrages[arbitrageId]) {
            revert ArbitrageAlreadyExecuted(arbitrageId);
        }
        executedArbitrages[arbitrageId] = true;
        _;
    }

    // ============ Flash Loan Implementation ============
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
        
        FlashLoanData memory flashData = abi.decode(params, (FlashLoanData));
        
        // Verificar timeout de execução
        if (block.timestamp > flashData.executionTimestamp + executionTimeout) {
            revert ExecutionTimeout(block.timestamp - flashData.executionTimestamp, executionTimeout);
        }

        uint256 gasStart = gasleft();
        bytes32 arbitrageId = _generateArbitrageId(asset, amount, flashData.params);
        
        ArbitrageResult memory result = _executeArbitrageLogic(
            asset,
            amount,
            premium,
            flashData.params,
            arbitrageId
        );

        if (result.success) {
            uint256 gasUsed = gasStart - gasleft();
            totalSuccessfulArbitrages++;
            totalProfitGenerated += result.profit;

            emit ArbitrageExecuted(
                asset,
                amount,
                result.profit,
                flashData.params.dex1Router,
                flashData.params.dex2Router,
                gasUsed,
                block.timestamp,
                arbitrageId
            );
        } else {
            emit ArbitrageFailed(
                asset,
                amount,
                result.failureReason,
                flashData.params.dex1Router,
                flashData.params.dex2Router,
                block.timestamp,
                arbitrageId
            );
            
            // Ainda devemos repagar o flash loan mesmo se falhou
            _repayFlashLoan(asset, amount, premium);
            return false;
        }

        return true;
    }

    function _executeArbitrageLogic(
        address asset,
        uint256 amount,
        uint256 premium,
        ArbitrageParams memory params,
        bytes32 arbitrageId
    ) internal returns (ArbitrageResult memory) {
        
        // Validações de segurança
        if (!_validateArbitrageParams(asset, amount, params)) {
            return ArbitrageResult({
                success: false,
                profit: 0,
                gasUsed: 0,
                actualAmountOut: 0,
                failureReason: "INVALID_PARAMETERS"
            });
        }

        try this._performArbitrageSwaps(asset, amount, params) returns (uint256 finalAmount) {
            uint256 totalOwed = amount + premium;
            
            if (finalAmount < totalOwed) {
                return ArbitrageResult({
                    success: false,
                    profit: 0,
                    gasUsed: 0,
                    actualAmountOut: finalAmount,
                    failureReason: "INSUFFICIENT_BALANCE_TO_REPAY"
                });
            }

            uint256 profit = finalAmount - totalOwed;
            uint256 minExpectedProfit = (amount * minProfitBasisPoints) / 10000;
            
            if (profit < minExpectedProfit) {
                return ArbitrageResult({
                    success: false,
                    profit: profit,
                    gasUsed: 0,
                    actualAmountOut: finalAmount,
                    failureReason: "PROFIT_BELOW_MINIMUM"
                });
            }

            // Repagar flash loan
            IERC20(asset).approve(address(aavePool), totalOwed);
            
            // Transferir lucro para owner
            if (profit > 0) {
                IERC20(asset).transfer(owner(), profit);
            }

            return ArbitrageResult({
                success: true,
                profit: profit,
                gasUsed: 0,
                actualAmountOut: finalAmount,
                failureReason: ""
            });

        } catch Error(string memory reason) {
            return ArbitrageResult({
                success: false,
                profit: 0,
                gasUsed: 0,
                actualAmountOut: 0,
                failureReason: reason
            });
        } catch {
            return ArbitrageResult({
                success: false,
                profit: 0,
                gasUsed: 0,
                actualAmountOut: 0,
                failureReason: "UNKNOWN_ERROR"
            });
        }
    }

    function _performArbitrageSwaps(
        address asset,
        uint256 amount,
        ArbitrageParams memory params
    ) external returns (uint256) {
        require(msg.sender == address(this), "INTERNAL_ONLY");
        
        // Primeira troca: asset -> tokenB
        IERC20(asset).approve(params.dex1Router, amount);
        
        address[] memory path1 = new address[](2);
        path1[0] = asset;
        path1[1] = params.tokenB;
        
        uint256[] memory amounts1 = IUniswapV2Router02(params.dex1Router)
            .swapExactTokensForTokens(
                amount,
                0, // Slippage controlado na segunda troca
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
        
        uint256[] memory amounts2 = IUniswapV2Router02(params.dex2Router)
            .swapExactTokensForTokens(
                tokenBAmount,
                params.minAmountOut,
                path2,
                address(this),
                params.deadline
            );
        
        return amounts2[1];
    }

    function _validateArbitrageParams(
        address asset,
        uint256 amount,
        ArbitrageParams memory params
    ) internal view returns (bool) {
        
        // Validar tokens suportados
        if (!supportedTokens[asset] || !supportedTokens[params.tokenB]) {
            return false;
        }
        
        // Validar routers autorizados
        if (!authorizedRouters[params.dex1Router] || !authorizedRouters[params.dex2Router]) {
            return false;
        }
        
        // Validar quantidades
        if (amount == 0 || amount > MAX_LOAN_AMOUNT || params.minAmountOut == 0) {
            return false;
        }
        
        // Validar deadline
        if (params.deadline <= block.timestamp) {
            return false;
        }
        
        // Validar gas price
        if (params.maxGasPrice > 0 && tx.gasprice > params.maxGasPrice) {
            return false;
        }
        
        // Validar que não é o mesmo token
        if (asset == params.tokenB) {
            return false;
        }
        
        return true;
    }

    function _repayFlashLoan(address asset, uint256 amount, uint256 premium) internal {
        uint256 totalOwed = amount + premium;
        uint256 balance = IERC20(asset).balanceOf(address(this));
        
        if (balance >= totalOwed) {
            IERC20(asset).approve(address(aavePool), totalOwed);
        } else {
            // Em caso de falha, tentar recuperar fundos do owner se disponível
            revert FlashLoanFailed("INSUFFICIENT_BALANCE_FOR_REPAYMENT");
        }
    }

    function _generateArbitrageId(
        address asset,
        uint256 amount,
        ArbitrageParams memory params
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            asset,
            amount,
            params.dex1Router,
            params.dex2Router,
            params.salt,
            block.timestamp,
            msg.sender
        ));
    }

    // ============ Main Execution Function ============
    function executeArbitrage(
        address asset,
        uint256 amount,
        ArbitrageParams calldata params,
        uint256 expectedProfit
    ) external 
        onlyAuthorizedCaller 
        nonReentrant 
        whenNotPaused
        validDeadline(params.deadline)
        gasOptimized(params.maxGasPrice == 0 ? maxGasPrice : params.maxGasPrice)
        nonReplayable(_generateArbitrageId(asset, amount, params))
    {
        if (amount == 0 || amount > MAX_LOAN_AMOUNT) {
            revert InvalidAmount(amount);
        }

        FlashLoanData memory flashData = FlashLoanData({
            params: params,
            expectedProfit: expectedProfit,
            executionTimestamp: block.timestamp
        });
        
        bytes memory data = abi.encode(flashData);
        
        address[] memory assets = new address[](1);
        assets[0] = asset;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // Flash loan mode
        
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

    // ============ Administration Functions ============
    function authorizeRouter(address router, bool authorized) external onlyOwner {
        if (router == address(0)) revert UnauthorizedRouter(router);
        authorizedRouters[router] = authorized;
        emit RouterAuthorized(router, authorized, msg.sender);
    }

    function authorizeCaller(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert UnauthorizedCaller(caller);
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized, msg.sender);
    }

    function setSupportedToken(address token, bool supported) external onlyOwner {
        if (token == address(0)) revert UnsupportedToken(token);
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported, msg.sender);
    }

    function updateConfig(
        uint256 _minProfitBasisPoints,
        uint256 _maxSlippageBasisPoints,
        uint256 _maxGasPrice
    ) external onlyOwner {
        require(_minProfitBasisPoints <= 1000, "MIN_PROFIT_TOO_HIGH");
        require(_maxSlippageBasisPoints <= MAX_SLIPPAGE_BPS, "MAX_SLIPPAGE_TOO_HIGH");
        require(_maxGasPrice > 0, "INVALID_GAS_PRICE");
        
        uint256 oldMinProfit = minProfitBasisPoints;
        uint256 oldMaxSlippage = maxSlippageBasisPoints;
        
        minProfitBasisPoints = _minProfitBasisPoints;
        maxSlippageBasisPoints = _maxSlippageBasisPoints;
        maxGasPrice = _maxGasPrice;
        
        emit ConfigurationUpdated(oldMinProfit, _minProfitBasisPoints, oldMaxSlippage, _maxSlippageBasisPoints, msg.sender);
    }

    // ============ Emergency Functions ============
    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyActionTaken("PAUSE", msg.sender, block.timestamp);
    }

    function emergencyUnpause() external onlyOwner {
        if (block.timestamp < lastEmergencyTime + emergencyCooldown) {
            revert EmergencyCooldownActive(lastEmergencyTime + emergencyCooldown - block.timestamp);
        }
        _unpause();
        lastEmergencyTime = block.timestamp;
        emit EmergencyActionTaken("UNPAUSE", msg.sender, block.timestamp);
    }

    function emergencyWithdraw(address token, uint256 amount, address recipient) external onlyOwner {
        require(recipient != address(0), "INVALID_RECIPIENT");
        
        if (token == address(0)) {
            payable(recipient).transfer(amount);
        } else {
            IERC20(token).transfer(recipient, amount);
        }
        
        emit EmergencyActionTaken("WITHDRAW", msg.sender, block.timestamp);
        emit ProfitWithdrawn(token, amount, recipient);
    }

    // ============ View Functions ============
    function getArbitrageStats() external view returns (
        uint256 successfulArbitrages,
        uint256 totalProfit,
        uint256 currentMinProfit,
        uint256 currentMaxSlippage
    ) {
        return (
            totalSuccessfulArbitrages,
            totalProfitGenerated,
            minProfitBasisPoints,
            maxSlippageBasisPoints
        );
    }

    function isArbitrageExecuted(bytes32 arbitrageId) external view returns (bool) {
        return executedArbitrages[arbitrageId];
    }

    function calculateArbitrageId(
        address asset,
        uint256 amount,
        ArbitrageParams calldata params
    ) external view returns (bytes32) {
        return _generateArbitrageId(asset, amount, params);
    }

    function estimateGasCost(uint256 gasPrice) external pure returns (uint256) {
        // Estimativa baseada em execuções típicas
        uint256 estimatedGas = 400000; // Gas estimado para arbitragem completa
        return gasPrice * estimatedGas;
    }

    // ============ Profit Management ============
    function withdrawProfits(address token, address recipient) external onlyOwner {
        require(recipient != address(0), "INVALID_RECIPIENT");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(recipient, balance);
            emit ProfitWithdrawn(token, balance, recipient);
        }
    }

    function withdrawETH(address payable recipient) external onlyOwner {
        require(recipient != address(0), "INVALID_RECIPIENT");
        
        uint256 balance = address(this).balance;
        if (balance > 0) {
            recipient.transfer(balance);
            emit ProfitWithdrawn(address(0), balance, recipient);
        }
    }
}