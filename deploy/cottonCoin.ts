import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const cottonCoin = await deploy("CottonCoin", {
    from: deployer,
    args: [],
    log: true,
  });

  console.log(`CottonCoin contract: `, cottonCoin.address);
};

export default func;
func.id = "deploy_cotton_coin"; // id required to prevent reexecution
func.tags = ["CottonCoin"];
