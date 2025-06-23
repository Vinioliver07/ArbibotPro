require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20", // Verifique se esta é a versão do Solidity usada em seu contrato
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/SUA_CHAVE_ALCHEMY_OU_INFURA", // <<< SUBSTITUA PELA SUA CHAVE REAL
        blockNumber: 18000000, // Opcional: forkar de um bloco específico para testes consistentes
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};
