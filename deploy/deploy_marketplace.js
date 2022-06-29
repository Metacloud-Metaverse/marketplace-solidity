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
        tokenContractAddress = "0x3Cf48E33fCD33A08171b6d01263B6dAD28FBBD27";
        landContractAddress = "0x0D4e47AC9F748bf65a57316f63e71F6dEC83a3B4";
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