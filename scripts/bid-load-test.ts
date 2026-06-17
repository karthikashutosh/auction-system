import axios from "axios";

const auctionId = "2c1283fa-e1e6-4fcb-99d8-08bb2d8cb134";
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRjMDYzMzdmLTVmNmQtNDk2My1hMmRjLTMwYjMzOTBkNzBmYiIsImVtYWlsIjoiamF5YXJvb3BpbmkuZ29wYWxAbWFuZ29sZWFwLmNvbSIsImlhdCI6MTc4MTY2NzE0MH0.DL073XswEzJKS3Ji0gbtvmWYEs9XpNGHPJIE-4klEeQ";

async function run() {
  const requests = Array.from({ length: 50 }, (_, index) =>
    axios.post(
      `http://localhost:3001/api/auctions/${auctionId}/bids`,
      {
        bidAmount: 51000,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );

  const results = await Promise.allSettled(requests);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.log(`Request ${index}:`, result.reason.response?.data?.message);
    }
  });

  const successfulBids = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value.data.bidAmount);

  console.log("Highest Bid:", Math.max(...successfulBids));

  const successCount = results.filter(
    (result) => result.status === "fulfilled"
  ).length;

  const failedCount = results.filter(
    (result) => result.status === "rejected"
  ).length;

  console.log("================================");
  console.log(`Total Requests : ${results.length}`);
  console.log(`Success        : ${successCount}`);
  console.log(`Failed         : ${failedCount}`);
  console.log("================================");
}

run();
