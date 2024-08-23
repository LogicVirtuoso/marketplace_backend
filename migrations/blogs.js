module.exports = {
  async up(db, client) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection("blogs").insertOne({
          title: "What is an NFT?",
          image:
            "https://testnets.opensea.io/static/images/learn-center//what-is-nft.png",
          link: "https://opensea.io/learn/what-are-nfts",
        });
        await db.collection("blogs").insertOne({
          title: "How to buy an NFT",
          image:
            "https://testnets.opensea.io/static/images/learn-center//how-to-buy-nft.png",
          link: "https://opensea.io/learn/how-to-buy-nft",
        });
      });
    } finally {
      await session.endSession();
    }
  },

  async down(db, client) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection("blogs").drop();
      });
    } finally {
      await session.endSession();
    }
  },
};
