const { deployments, ethers } = require("hardhat");

const initialSetup = deployments.createFixture(
    async({ deployments }) => {
        // Get some users
        const [deployer, user1, user2] = await ethers.getSigners();
        // Deploy contracts
        await deployments.fixture();
        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const TestERC721 = await ethers.getContractFactory("TestERC721");
        const Marketplace = await ethers.getContractFactory("Marketplace");
        const tokenContract = await TestERC20.deploy();
        const landContract = await TestERC721.deploy();
        const marketplace = await Marketplace.deploy(tokenContract.address, landContract.address);
        // Mint some Lands and tokens (they need approval)
        await landContract.mintTo(user1.address, 1);
        await landContract.mintTo(user1.address, 2);
        await tokenContract.mintTo(user2.address, ethers.utils.parseEther("10"));
        return { contracts: { marketplace, tokenContract, landContract }};
    }
);

module.exports = {
    initialSetup
}