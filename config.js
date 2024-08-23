const configEnvs = () => {
  let portNumber,
    clientUrl,
    dbUrl,
    dbOption,
    serverUrl,
    ipfsUrl,
    thegraph,
    factoryAddr,
    auctionAddr;
  switch (process.env.NODE_ENV) {
    case "production":
      portNumber = 8080;
      clientUrl = process.env.AWS_UI_URL;
      dbUrl =
        "mongodb://james:nitrility2023@nitrility-license-marketplace.cluster-caqe8bujsmgo.us-east-2.docdb.amazonaws.com:27017/nitrility-marketplace?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false";
      dbOption = {
        useFindAndModify: false,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ssl: true,
        sslValidate: true,
        sslCA: "rds-combined-ca-bundle.pem",
      };
      serverUrl = process.env.AWS_SERVER;
      ipfsUrl = process.env.AWS_IPFS_METADATA_API_URL;
      thegraph = process.env.AWS_THEGRAPH_URL;
      factoryAddr = process.env.AWS_FACTORY_ADDRESS;
      auctionAddr = process.env.AWS_AUCTION_ADDRESS;
      break;
    case "development":
      portNumber = 8080;
      clientUrl = process.env.LOCAL_UI_URL;
      dbUrl = "mongodb://localhost:27017/nitrility-marketplace";
      dbOption = {
        useCreateIndex: true,
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
      };
      serverUrl = process.env.LOCAL_SERVER;
      ipfsUrl = process.env.AWS_IPFS_METADATA_API_URL;
      thegraph = process.env.LOCAL_THEGRAPH_URL;
      factoryAddr = process.env.LOCAL_FACTORY_ADDRESS;
      auctionAddr = process.env.LOCAL_AUCTION_ADDRESS;
      break;
    default:
      break;
  }

  return {
    portNumber,
    clientUrl,
    dbUrl,
    dbOption,
    serverUrl,
    ipfsUrl,
    thegraph,
    factoryAddr,
    auctionAddr,
  };
};

const envObj = configEnvs();

exports.PORT = envObj.portNumber;
exports.CLIENT_ORIGIN = envObj.clientUrl;
exports.DB_URL = envObj.dbUrl;
exports.DB_OPTION = envObj.dbOption;
exports.SERVER_URL = envObj.serverUrl;
exports.IPFS_METADATA_API_URL = envObj.ipfsUrl;
exports.THEGRAPH_URL = envObj.thegraph;
exports.CONTRACT_FACTORY_ADDRESS = envObj.factoryAddr;
exports.CONTRACT_AUCTION_ADDRESS = envObj.auctionAddr;

exports.RPC_URL =
  "https://arbitrum-mainnet.infura.io/v3/3631dcda17c9413a8c3af765b0b2337b"; //process.env.RPC_URL;
exports.COMPANY_ACCOUNT_PRIVATE_KEY = process.env.COMPANY_ACCOUNT_PRIVATE_KEY;
exports.EXPIRATION_TIME = 24 * 60 * 60 * 1000;
exports.MAX_RECOMMENDATION_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000;
exports.INTERVAL_DURATION = 1000 * 3;

exports.FILTER_TYPES = {
  lowToHigh: 0,
  highToLow: 1,
  recentlyListed: 2,
  bestOffer: 3,
  lastSale: 4,
  recentlySold: 5,
  recentlyCreted: 6,
  oldest: 7,
  endingSoon: 8,
  recentlyReceived: 9,
};

exports.RECENT_TIME = 3; // days

// check if this is for seller or buyer
exports.SELLER_IDX = "idenfy_seller";
exports.BUYER_IDX = "_idenfy_buyer";
