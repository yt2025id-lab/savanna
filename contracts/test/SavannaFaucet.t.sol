// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SavannaFaucet} from "../src/faucet/SavannaFaucet.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract SavannaFaucetTest is Test {
    SavannaFaucet public faucet;
    MockERC20 public usdc;
    MockERC20 public cbbtc;
    MockERC20 public cbeth;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant CLAIM_AMOUNT = 100e6;   // 100 USDC (6 decimals)
    uint256 public constant COOLDOWN = 24 hours;
    uint256 public constant START_TIME = 1_000_000;

    function setUp() public {
        vm.warp(START_TIME);

        vm.startPrank(owner);
        faucet = new SavannaFaucet(owner);
        usdc = new MockERC20("Mock USDC", "USDC", 6, 1_000_000e6, owner);
        cbbtc = new MockERC20("Mock cbBTC", "cbBTC", 8, 100e8, owner);
        cbeth = new MockERC20("Mock cbETH", "cbETH", 18, 1000e18, owner);

        usdc.transfer(address(faucet), 10_000e6);   // 10k USDC
        cbbtc.transfer(address(faucet), 1e8);        // 1 cbBTC
        cbeth.transfer(address(faucet), 10e18);      // 10 cbETH

        faucet.addToken(address(usdc), CLAIM_AMOUNT, COOLDOWN);
        faucet.addToken(address(cbbtc), 0.001e8, COOLDOWN);
        faucet.addToken(address(cbeth), 0.01e18, COOLDOWN);
        vm.stopPrank();
    }

    // ============ Deployment ============

    function test_constructor_setsOwner() public view {
        assertEq(faucet.owner(), owner);
    }

    // ============ addToken ============

    function test_addToken() public {
        MockERC20 newToken = new MockERC20("New", "NEW", 18, 1e18, address(this));
        vm.prank(owner);
        faucet.addToken(address(newToken), 100e18, 12 hours);

        (IERC20 tokenAddr, uint256 amount, uint256 cooldown) = faucet.tokens(address(newToken));
        assertEq(address(tokenAddr), address(newToken));
        assertEq(amount, 100e18);
        assertEq(cooldown, 12 hours);
        assertEq(faucet.getTokenCount(), 4);
    }

    function test_addToken_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Zero address");
        faucet.addToken(address(0), 100e6, COOLDOWN);
    }

    function test_addToken_revertZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert("Zero amount");
        faucet.addToken(address(usdc), 0, COOLDOWN);
    }

    function test_addToken_revertZeroCooldown() public {
        vm.prank(owner);
        vm.expectRevert("Zero cooldown");
        faucet.addToken(address(usdc), 100e6, 0);
    }

    function test_addToken_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        faucet.addToken(address(usdc), 100e6, COOLDOWN);
    }

    function test_addToken_emitsEvent() public {
        MockERC20 newToken = new MockERC20("New", "NEW", 18, 1e18, address(this));
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SavannaFaucet.TokenAdded(address(newToken), 200e18, 6 hours);
        faucet.addToken(address(newToken), 200e18, 6 hours);
    }

    // ============ updateToken ============

    function test_updateToken() public {
        vm.prank(owner);
        faucet.updateToken(address(usdc), 200e6, 12 hours);

        (IERC20 tokenAddr, uint256 amount, uint256 cooldown) = faucet.tokens(address(usdc));
        assertEq(address(tokenAddr), address(usdc));
        assertEq(amount, 200e6);
        assertEq(cooldown, 12 hours);
    }

    function test_updateToken_revertUnregistered() public {
        vm.prank(owner);
        vm.expectRevert("Token not registered");
        faucet.updateToken(makeAddr("fake"), 100e6, COOLDOWN);
    }

    function test_updateToken_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        faucet.updateToken(address(usdc), 200e6, COOLDOWN);
    }

    function test_updateToken_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SavannaFaucet.TokenUpdated(address(usdc), 200e6, 12 hours);
        faucet.updateToken(address(usdc), 200e6, 12 hours);
    }

    // ============ claim (single) ============

    function test_claim() public {
        uint256 balanceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        faucet.claim(address(usdc));

        uint256 balanceAfter = usdc.balanceOf(alice);
        assertEq(balanceAfter - balanceBefore, CLAIM_AMOUNT);
        assertEq(faucet.lastClaim(alice, address(usdc)), START_TIME);
    }

    function test_claim_revertUnsupportedToken() public {
        vm.prank(alice);
        vm.expectRevert("Token not supported");
        faucet.claim(makeAddr("fake"));
    }

    function test_claim_revertCooldown() public {
        vm.prank(alice);
        faucet.claim(address(usdc));

        vm.warp(START_TIME + COOLDOWN - 1); // still in cooldown

        vm.prank(alice);
        vm.expectRevert("Cooldown active");
        faucet.claim(address(usdc));
    }

    function test_claim_allowsAfterCooldown() public {
        vm.prank(alice);
        faucet.claim(address(usdc));

        vm.warp(START_TIME + COOLDOWN + 1); // cooldown passed

        vm.prank(alice);
        faucet.claim(address(usdc));

        assertEq(faucet.lastClaim(alice, address(usdc)), START_TIME + COOLDOWN + 1);
    }

    function test_claim_revertFaucetDry() public {
        // Drain faucet
        vm.startPrank(owner);
        uint256 faucetBalance = usdc.balanceOf(address(faucet));
        faucet.withdrawToken(address(usdc), faucetBalance);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert("Faucet dry");
        faucet.claim(address(usdc));
    }

    function test_claim_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit SavannaFaucet.TokenClaimed(alice, address(usdc), CLAIM_AMOUNT);
        faucet.claim(address(usdc));
    }

    function test_claim_independentCooldownPerToken() public {
        vm.prank(alice);
        faucet.claim(address(usdc));

        // Different token should still be claimable
        vm.prank(alice);
        faucet.claim(address(cbbtc));

        assertEq(faucet.lastClaim(alice, address(usdc)), START_TIME);
        assertEq(faucet.lastClaim(alice, address(cbbtc)), START_TIME);
    }

    function test_claim_independentCooldownPerUser() public {
        vm.prank(alice);
        faucet.claim(address(usdc));

        // Bob should be able to claim immediately
        vm.prank(bob);
        faucet.claim(address(usdc));

        assertEq(faucet.lastClaim(alice, address(usdc)), START_TIME);
        assertEq(faucet.lastClaim(bob, address(usdc)), START_TIME);
    }

    // ============ claimMultiple ============

    function test_claimMultiple() public {
        uint256 usdcBefore = usdc.balanceOf(alice);
        uint256 cbbtcBefore = cbbtc.balanceOf(alice);

        address[] memory tokens = new address[](2);
        tokens[0] = address(usdc);
        tokens[1] = address(cbbtc);

        vm.prank(alice);
        faucet.claimMultiple(tokens);

        assertEq(usdc.balanceOf(alice) - usdcBefore, CLAIM_AMOUNT);
        assertEq(cbbtc.balanceOf(alice) - cbbtcBefore, 0.001e8);
    }

    function test_claimMultiple_singleToken() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(usdc);

        vm.prank(alice);
        faucet.claimMultiple(tokens);

        assertEq(faucet.lastClaim(alice, address(usdc)), START_TIME);
    }

    function test_claimMultiple_emptyArray() public {
        address[] memory tokens = new address[](0);

        vm.prank(alice);
        faucet.claimMultiple(tokens); // should not revert
    }

    // ============ getTokenCount ============

    function test_getTokenCount() public view {
        assertEq(faucet.getTokenCount(), 3);
    }

    function test_getTokenCount_afterAdd() public {
        MockERC20 newToken = new MockERC20("New", "NEW", 18, 1e18, address(this));
        vm.prank(owner);
        faucet.addToken(address(newToken), 100e18, 12 hours);
        assertEq(faucet.getTokenCount(), 4);
    }

    // ============ getTokenCooldown ============

    function test_getTokenCooldown_noClaim() public view {
        uint256 remaining = faucet.getTokenCooldown(address(usdc), alice);
        assertEq(remaining, 0);
    }

    function test_getTokenCooldown_afterClaim() public {
        vm.prank(alice);
        faucet.claim(address(usdc));

        uint256 remaining = faucet.getTokenCooldown(address(usdc), alice);
        assertEq(remaining, COOLDOWN);
    }

    function test_getTokenCooldown_partialCooldown() public {
        vm.prank(alice);
        faucet.claim(address(usdc));

        vm.warp(START_TIME + 12 hours); // halfway through cooldown

        uint256 remaining = faucet.getTokenCooldown(address(usdc), alice);
        assertEq(remaining, COOLDOWN - 12 hours);
    }

    function test_getTokenCooldown_expired() public {
        vm.prank(alice);
        faucet.claim(address(usdc));

        vm.warp(START_TIME + COOLDOWN + 1);

        uint256 remaining = faucet.getTokenCooldown(address(usdc), alice);
        assertEq(remaining, 0);
    }

    function test_getTokenCooldown_independentPerToken() public {
        vm.prank(alice);
        faucet.claim(address(usdc));

        uint256 usdcRemaining = faucet.getTokenCooldown(address(usdc), alice);
        uint256 cbbtcRemaining = faucet.getTokenCooldown(address(cbbtc), alice);

        assertEq(usdcRemaining, COOLDOWN);
        assertEq(cbbtcRemaining, 0);
    }

    // ============ drip (owner only) ============

    function test_drip() public {
        uint256 balanceBefore = usdc.balanceOf(owner);
        uint256 dripAmount = 50e6;

        vm.prank(owner);
        faucet.drip(address(usdc), dripAmount);

        assertEq(usdc.balanceOf(owner) - balanceBefore, dripAmount);
    }

    function test_drip_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        faucet.drip(address(usdc), 50e6);
    }

    // ============ withdrawToken (owner only) ============

    function test_withdrawToken() public {
        uint256 faucetBalance = usdc.balanceOf(address(faucet));
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);

        vm.prank(owner);
        faucet.withdrawToken(address(usdc), faucetBalance);

        assertEq(usdc.balanceOf(owner) - ownerBalanceBefore, faucetBalance);
        assertEq(usdc.balanceOf(address(faucet)), 0);
    }

    function test_withdrawToken_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        faucet.withdrawToken(address(usdc), 50e6);
    }

    function test_withdrawToken_partial() public {
        uint256 ownerBalanceBefore = usdc.balanceOf(owner);

        vm.prank(owner);
        faucet.withdrawToken(address(usdc), 500e6);

        assertEq(usdc.balanceOf(owner) - ownerBalanceBefore, 500e6);
    }
}
