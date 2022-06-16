
module.exports = async ({ getNamedAccounts, deployments, network }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let tokenContractAddress, landContractAddress;

    // If not mainnet, deploy token and nft for testing purposes
    if (network.name == "hardhat") {
        const TestERC20 = await deploy('TestERC20', {
            from: deployer,
            log: true,
            autoMine: true
        });

        const TestERC721 = await deploy('TestERC721', {
            from: deployer,
            log: true,
            autoMine: true
        });

        tokenContractAddress = TestERC20.address;
        landContractAddress = TestERC721.address;
    } else {
        // TODO: fill with real addresses
        tokenContractAddress = "0x0000000000000000000000000000000000000000";
        landContractAddress = "0x0000000000000000000000000000000000000000";
    }

    // Deploy Marketplace contract
    await deploy('Marketplace', {
        from: deployer,
        args: [tokenContractAddress, landContractAddress],
        log: true,
        autoMine: true
    });

};

module.exports.tags = ['Marketplace'];