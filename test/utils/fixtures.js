const { deployments, ethers } = require("hardhat");

const initialSetup = deployments.createFixture(
    async({ deployments }) => {
        await deployments.fixture();
        const TestERC20 = await ethers.getContractFactory("TestERC20");
        const TestERC721 = await ethers.getContractFactory("TestERC721");
        const tokenContract = await TestERC20.deploy();
        const landContract = await TestERC721.deploy();
        const Marketplace = await ethers.getContractFactory("Marketplace");
        const marketplace = await Marketplace.deploy(tokenContract.address, landContract.address);
        return { contracts: { marketplace, tokenContract, landContract }};
    }
);

module.exports = {
    initialSetup
}