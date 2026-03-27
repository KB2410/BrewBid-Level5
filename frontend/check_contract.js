const { rpc, xdr } = require("@stellar/stellar-sdk");

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const CONTRACT_ID = "CCABVHDIAQM4V4GYG6IOF36A5FKXUVYP7P7BFQXHCECHN673STEKFCHY";

async function checkContract() {
  const server = new rpc.Server(RPC_URL);
  try {
    const ledger = await server.getLatestLedger();
    console.log("Latest Ledger:", ledger.sequence);

    const response = await server.getEvents({
      startLedger: ledger.sequence - 1000,
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ID],
        },
      ],
    });
    console.log("Events found:", response.events.length);
    if (response.events.length === 0) {
      console.warn(
        "No events found for this contract in the last 1000 ledgers. Is it deployed?",
      );
    } else {
      console.log("Found recent events! Printing last one:");
      console.log(
        JSON.stringify(response.events[response.events.length - 1], null, 2),
      );
    }
  } catch (e) {
    console.error("Error checking contract:", e);
  }
}

checkContract();
