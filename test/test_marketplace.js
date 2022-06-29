const { expect } = require('chai');
const { ethers } = require("hardhat");
const { OrderStatus } = require("./utils/constants");
const { initialSetup } = require("./utils/fixtures");

const CLOUDtoBigNumber = (value) => ethers.utils.parseUnits(value, 8);

describe("Marketplace", () => {
    // Define variables for the contract instances
    let marketplace, tokenContract, landContract;
    // Define variables for accounts to interact with contracts
    let deployer, user1, user2, user3;

    const tenClouds = CLOUDtoBigNumber("10");

    beforeEach(async () => {
        // Get contracts instances from fixture
        const { contracts } = await initialSetup();
        ({ marketplace, tokenContract, landContract } = contracts);
        [deployer, user1, user2, user3] = await ethers.getSigners();
    });

    describe("Initial setup", () => {
        it("Should verify that deployer is the owner of marketplace", async () => {
            expect(
                await marketplace.owner()
            ).to.equal(deployer.address);
        });
    
        it("Should revert trying to pause contract as non owner", async () => {
            await expect(
                marketplace.connect(user1).togglePauseMarketplace()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should pause contract successfully", async () => {
            // Pause marketplace
            await marketplace.togglePauseMarketplace();
            // Verify that marketplace is paused
            expect(
                await marketplace.paused()
            ).to.be.true;
            // Revert trying to create an order while paused
            await expect(
                marketplace.createOrder(0, tenClouds)
            ).to.be.revertedWith("Pausable: paused");
        });
    
        it("Should unpause contract successfully", async () => {
            // Pause marketplace
            await marketplace.togglePauseMarketplace();
            // Unpause marketplace
            await marketplace.togglePauseMarketplace();
            expect(
                await marketplace.paused()
            ).to.be.false;
        });

        it("Should verify that user1 is the owner of Land ID 1", async () => {
            expect(
                await landContract.ownerOf(1)
            ).to.equal(user1.address);
        });

        it("Should change fee per thousand successfully", async () => {
            // Change fee per thousand
            expect(
                await marketplace.setFeePerThousand(100)
            ).to.emit(
                marketplace, "FeeChanged"
            ).withArgs(25, 100);
            // Verify that fee per thousand is changed to 100
            expect(
                await marketplace.feePerThousand()
            ).to.equal(100);
        });

        it("Should revert trying to set fee higher than 999", async () => {
            await expect(
                marketplace.setFeePerThousand(1000)
            ).to.be.revertedWith("The fee must be between 0 and 999");
            // Verify that feePerThousand is still 25
            expect(
                await marketplace.feePerThousand()
            ).to.equal(25);
        });

        it("Should change fee receiver successfully", async () => {
            expect(
                await marketplace.setFeeReceiver(user3.address)
            ).to.emit(
                marketplace, "FeeReceiverChanged"
            ).withArgs(0, user3.address);
        });
    });

    describe("Creating orders", () => {
        it("Should revert trying to create order for Land ID 1 as non owner", async () => {
            // Create order
            await expect(
                marketplace.connect(user2).createOrder(1, tenClouds)
            ).to.be.revertedWith("Only Land owner can create orders");
        });

        it("Should revert trying to create order for Land ID 1 with price 0", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order
            await expect(
                marketplace.connect(user1).createOrder(1, 0)
            ).to.be.revertedWith("Order price must be greater than 0");
        });

        it("Should revert trying to create order for Land ID 1 without approve contract", async () => {
            // Create order
            await expect(
                marketplace.connect(user1).createOrder(1, tenClouds)
            ).to.be.revertedWith("Marketplace contract is not authorized to manage the asset");
        });

        it("Should create order for Land ID 1 successfully", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            expect(
                await marketplace.connect(user1).createOrder(1, tenClouds)
            ).to.emit(
                marketplace, "OrderCreated"
            ).withArgs(
                0,
                1,
                user1.address,
                tenClouds
            );
            // Verify that order is created correctly
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.assetId).to.equal(1);
            expect(orderZero.seller).to.equal(user1.address);
            expect(orderZero.price).to.equal(tenClouds);
            expect(orderZero.status).to.equal(OrderStatus.Open);
        });

        it("Should revert trying to create order for Land ID 1 twice", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Create order to sell Land ID 1 again
            await expect(
                marketplace.connect(user1).createOrder(1, tenClouds)
            ).to.be.revertedWith("The asset already have an open order");
        });
    });

    describe("Buying Lands", () => {
        it("Should revert trying to execute order ID 2 (does not exist)", async () => {
            // Buy Land ID 2
            await expect(
                marketplace.connect(user1).executeOrder(2)
            ).to.be.revertedWith("The order does not exist");
        });

        it("Should revert trying to buy Land ID 1 being the owner", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Try to buy that land
            await expect(
                marketplace.connect(user1).executeOrder(0)
            ).to.be.revertedWith("Unauthorized user");
            // Verify that order status is still open
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.status).to.equal(OrderStatus.Open);
        });

        it("Should revert trying to buy Land ID 1 without approve token", async() => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Try to buy that land
            await expect(
                marketplace.connect(user2).executeOrder(0)
            ).to.be.revertedWith("ERC20: insufficient allowance");
            // Verify that order status is still open
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.status).to.equal(OrderStatus.Open);
        });

        it("Should revert trying to buy Land ID 1 with insufficient funds", async() => {
            // Approve marketplace contract to manage Land ID 1 & tokens
            await landContract.connect(user1).approve(marketplace.address, 1);
            await tokenContract.connect(user3).approve(marketplace.address, tenClouds);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Try to buy that land
            await expect(
                marketplace.connect(user3).executeOrder(0)
            ).to.be.revertedWith("The buyer does not have enough tokens");
            // Verify that order status is still open
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.status).to.equal(OrderStatus.Open);
        });

        it("Should revert trying to buy Land ID 1 without being the owner anymore", async () => {
            // Approve marketplace contract to manage Land ID 1 & tokens
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Transfer Land ID 1 to user2
            await landContract.connect(user1).transferFrom(user1.address, user2.address, 1);
            // Try to buy that land
            await expect(
                marketplace.connect(user2).executeOrder(0)
            ).to.be.revertedWith("The seller is no longer the owner");
        });
    
        it("Should buy Land ID 1 successfully without fee", async () => {
            // Approve marketplace contract to manage Land ID 1 & tokens
            await landContract.connect(user1).approve(marketplace.address, 1); 
            await tokenContract.connect(user2).approve(marketplace.address, ethers.constants.MaxUint256);
            // Get token balances before buying
            const tokenBalanceUser1 = await tokenContract.balanceOf(user1.address);
            const tokenBalanceUser2 = await tokenContract.balanceOf(user2.address);
            const user2EtherBalance = await user2.getBalance();
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Buy Land ID 1 (order ID is 0)
            const buyTx = await marketplace.connect(user2).executeOrder(0);
            expect(
                buyTx
            ).to.emit(
                marketplace, "OrderSuccessful"
            ).withArgs(
                0,
                1,
                user1.address,
                tenClouds,
                user2.address
            );
            // Verify that order status is Executed
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.status).to.equal(OrderStatus.Executed);
            // Verify that Land ID 1 is owned by user2
            expect(
                await landContract.ownerOf(1)
            ).to.equal(user2.address);
            // Verify token balance on both users
            expect(
                await tokenContract.balanceOf(user1.address)
            ).to.equal(
                tokenBalanceUser1.add(tenClouds)
            );
            expect(
                await tokenContract.balanceOf(user2.address)
            ).to.equal(
                tokenBalanceUser2.sub(tenClouds)
            );
            // Verify gas consumed (in native coins)
            const waitedTx = await buyTx.wait();
            const gasUsed = waitedTx.gasUsed.mul(waitedTx.effectiveGasPrice);
            expect(
                await user2.getBalance()
            ).to.equal(user2EtherBalance.sub(gasUsed));
        });

        it("Should buy Land ID 1 successfully with fee", async () => {
            // Approve marketplace contract to manage Land ID 1 & tokens
            await landContract.connect(user1).approve(marketplace.address, 1); 
            await tokenContract.connect(user2).approve(marketplace.address, ethers.constants.MaxUint256);
            // Set feeReceiver
            await marketplace.setFeeReceiver(user3.address);
            // Get token balances before buying
            const tokenBalanceUser1 = await tokenContract.balanceOf(user1.address);
            const tokenBalanceUser2 = await tokenContract.balanceOf(user2.address);
            const tokenBalanceUser3 = await tokenContract.balanceOf(user3.address);
            const user2EtherBalance = await user2.getBalance();
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Buy Land ID 1 (order ID is 0)
            await marketplace.connect(user2).executeOrder(0);
            // Calculate fee
            const fee = tenClouds.mul(await marketplace.feePerThousand()).div(1000);
            // Verify token balance on all users
            expect(
                await tokenContract.balanceOf(user1.address)
            ).to.equal(
                tokenBalanceUser1.add(tenClouds).sub(fee)
            );
            expect(
                await tokenContract.balanceOf(user2.address)
            ).to.equal(
                tokenBalanceUser2.sub(tenClouds)
            );
            // Verify feeReceiver balance
            expect(
                await tokenContract.balanceOf(user3.address)
            ).to.equal(
                tokenBalanceUser3.add(fee)
            );
        });
    });

    describe("Cancelling orders", () => {
        it("Should revert trying to cancel order ID 0 without being the owner", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Try to cancel that order
            await expect(
                marketplace.connect(user2).cancelOrder(0)
            ).to.be.revertedWith("Unauthorized user");
            // Verify that order status is still open
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.status).to.equal(OrderStatus.Open);
        });

        it("Should revert trying to cancel order ID 1 (never created)", async () => {
            // Try to cancel order ID 1
            await expect(
                marketplace.connect(user1).cancelOrder(1)
            ).to.be.revertedWith("The order does not exist");
        });

        it("Should revert trying to cancel order ID 0 (already executed)", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Buy Land ID 1 (order ID is 0)
            await tokenContract.connect(user2).approve(marketplace.address, tenClouds);
            await marketplace.connect(user2).executeOrder(0);
            // Try to cancel that order
            await expect(
                marketplace.connect(user1).cancelOrder(0)
            ).to.be.revertedWith("The asset does not have an open order");
            // Verify that order status is Executed
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.status).to.equal(OrderStatus.Executed);
        });

        it("Should revert trying to cancel order without being Land owner anymore", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Transfer Land ID 1 to user2
            await landContract.connect(user1).transferFrom(user1.address, user2.address, 1);
            // Try to cancel that order
            await expect(
                marketplace.connect(user1).cancelOrder(0)
            ).to.be.revertedWith("The seller is no longer the owner");
        })

        it("Should cancel order ID 0 successfully", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, tenClouds);
            // Cancel order ID 0
            expect(
                await marketplace.connect(user1).cancelOrder(0)
            ).to.emit(
                marketplace, "OrderCancelled"
            ).withArgs(
                0,
                1,
                user1.address
            );
            // Verify that order status is Cancelled
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.status).to.equal(OrderStatus.Cancelled);
        });
    });
});