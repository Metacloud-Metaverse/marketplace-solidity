const { expect } = require('chai');
const { ethers } = require("hardhat");
const { OrderStatus } = require("./utils/constants");
const { initialSetup } = require("./utils/fixtures");

const etherToWei = ether => ethers.utils.parseEther(ether);

describe("Marketplace", () => {
    // Define variables for the contract instances
    let marketplace, tokenContract, landContract;
    // Define variables for accounts to interact with contracts
    let deployer, user1, user2, user3;

    const oneEther = etherToWei("1");

    beforeEach(async () => {
        // Get contracts instances from fixture
        const { contracts } = await initialSetup();
        ({ marketplace, tokenContract, landContract } = contracts);
        [deployer, user1, user2, user3] = await ethers.getSigners();
    });

    it("Should verify that deployer is the owner of marketplace", async () => {
        expect(
            await marketplace.owner()
        ).to.equal(deployer.address);
    });

    it("Should revert trying to pause contract as non owner", async () => {
        await expect(
            marketplace.connect(user1).pauseMarketplace()
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should verify that user1 is the owner of Land ID 1", async () => {
        expect(
            await landContract.ownerOf(1)
        ).to.equal(user1.address);
    });

    describe("Creating orders", () => {
        it("Should revert trying to create order for Land ID 1 as non owner", async () => {
            // Create order
            await expect(
                marketplace.connect(user2).createOrder(1, oneEther)
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
                marketplace.connect(user1).createOrder(1, oneEther)
            ).to.be.revertedWith("Marketplace contract is not authorized to manage the asset");
        });

        it("Should create order for Land ID 1 successfully", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            expect(
                await marketplace.connect(user1).createOrder(1, oneEther)
            ).to.emit(
                marketplace, "OrderCreated"
            ).withArgs(
                0,
                1,
                user1.address,
                oneEther
            );
            // Verify that order is created correctly
            const orderZero = await marketplace.getOrder(0);
            expect(orderZero.assetId).to.equal(1);
            expect(orderZero.seller).to.equal(user1.address);
            expect(orderZero.price).to.equal(oneEther);
            expect(orderZero.status).to.equal(OrderStatus.Open);
        });

        it("Should revert trying to create order for Land ID 1 twice", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, oneEther);
            // Create order to sell Land ID 1 again
            await expect(
                marketplace.connect(user1).createOrder(1, oneEther)
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
            await marketplace.connect(user1).createOrder(1, oneEther);
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
            await marketplace.connect(user1).createOrder(1, oneEther);
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
            await tokenContract.connect(user3).approve(marketplace.address, oneEther);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, oneEther);
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
            await tokenContract.connect(user3).approve(marketplace.address, oneEther);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, oneEther);
            // Transfer Land ID 1 to user2
            await landContract.connect(user1).transferFrom(user1.address, user2.address, 1);
            // Try to buy that land
            await expect(
                marketplace.connect(user2).executeOrder(0)
            ).to.be.revertedWith("The seller is no longer the owner");
        });
    
        it("Should buy Land ID 1 successfully", async () => {
            // Approve marketplace contract to manage Land ID 1 & tokens
            await landContract.connect(user1).approve(marketplace.address, 1); 
            await tokenContract.connect(user2).approve(marketplace.address, ethers.utils.parseEther("10"));
            // Get token balances before buying
            const tokenBalanceUser1 = await tokenContract.balanceOf(user1.address);
            const tokenBalanceUser2 = await tokenContract.balanceOf(user2.address);
            const user2EtherBalance = await user2.getBalance();
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, etherToWei("1"));
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
                oneEther,
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
                tokenBalanceUser1.add(oneEther)
            );
            expect(
                await tokenContract.balanceOf(user2.address)
            ).to.equal(
                tokenBalanceUser2.sub(oneEther)
            );
            // Verify gas consumed (in native coins)
            const waitedTx = await buyTx.wait();
            const gasUsed = waitedTx.gasUsed.mul(waitedTx.effectiveGasPrice);
            expect(
                await user2.getBalance()
            ).to.equal(user2EtherBalance.sub(gasUsed));
        });
    });

    describe("Cancelling orders", () => {
        it("Should revert trying to cancel order ID 0 without being the owner", async () => {
            // Approve marketplace contract to manage Land ID 1
            await landContract.connect(user1).approve(marketplace.address, 1);
            // Create order to sell Land ID 1
            await marketplace.connect(user1).createOrder(1, oneEther);
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
            await marketplace.connect(user1).createOrder(1, oneEther);
            // Buy Land ID 1 (order ID is 0)
            await tokenContract.connect(user2).approve(marketplace.address, oneEther);
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
            await marketplace.connect(user1).createOrder(1, oneEther);
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
            await marketplace.connect(user1).createOrder(1, oneEther);
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