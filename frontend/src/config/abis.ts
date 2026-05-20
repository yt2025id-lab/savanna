export const SAVANNA_VAULT_ABI = [
  // ERC-4626
  "function asset() external view returns (address)",
  "function totalAssets() external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function convertToShares(uint256 assets) external view returns (uint256)",
  "function maxDeposit(address) external view returns (uint256)",
  "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
  "function maxWithdraw(address) external view returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)",
  "function maxMint(address) external view returns (uint256)",
  "function mint(uint256 shares, address receiver) external returns (uint256 assets)",
  "function maxRedeem(address owner) external view returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)",
  // SavannaVault
  "function controller() external view returns (address)",
  "function totalDeployed() external view returns (uint256)",
  "function totalPositions() external view returns (uint256)",
  "function requestStrategy(uint256 timeHorizon) external",
  "function cancelTimedOutRequest() external",
  "function getUserPosition(address user) external view returns (tuple(uint256 depositAmount, uint256 timeHorizon, uint256 depositTimestamp, address activeStrategy, uint256 allocatedAmount, bool isActive))",
  "function hasActiveRequest(address user) external view returns (bool)",
  "function setController(address controller) external",
  "function pause() external",
  "function unpause() external",
  "event Deposited(address indexed user, uint256 amount, uint256 shares)",
  "event StrategyRequested(address indexed user, uint256 depositAmount, uint256 timeHorizon, uint256 timestamp)",
  "event StrategyExecuted(address indexed user, address strategy, uint256 amount)",
  "event StrategyCompleted(address indexed user, uint256 returnedAmount)",
  "event Withdrawn(address indexed user, uint256 amount, uint256 shares)",
] as const;

export const SAVANNA_CONTROLLER_ABI = [
  "function vault() external view returns (address)",
  "function forwarder() external view returns (address)",
  "function totalRecommendations() external view returns (uint256)",
  "function getStrategy(uint8 protocol) external view returns (address)",
  "function getLatestPrice(address asset) external view returns (int256 price)",
  "function withdrawFromStrategy(address user) external",
  "function onReport(bytes metadata, bytes report) external",
] as const;

export const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
] as const;
