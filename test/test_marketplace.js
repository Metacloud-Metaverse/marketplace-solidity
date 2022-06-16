const { expect } = require('chai');
const { ethers } = require("hardhat");
const { OrderStatus } = require("./utils/constants");
const { initialSetup } = require("./utils/fixtures");

describe("Marketplace", () => {
    let marketplace, tokenContract, landContract;
    let deployer, user1, user2;

    beforeEach(async () => {
        // Get contracts instances from fixture
        const { contracts } = await initialSetup();
        marketplace = contracts.marketplace;
        tokenContract = contracts.tokenContract;
        landContract = contracts.landContract;
        // Get some accounts
        [deployer, user1, user2] = await ethers.getSigners();
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

});