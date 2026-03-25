"use client";

import { useState, useEffect } from "react";
import {
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import {
  rpc,
  TransactionBuilder,
  Networks,
  xdr,
  Account,
  Contract,
  TimeoutInfinite,
  Address,
  ScInt,
} from "@stellar/stellar-sdk";

// ⚠️ PASTE YOUR DEPLOYED CONTRACT ID HERE
const CONTRACT_ID = "CCLI6FFDYPVD7E6A45Q6QKHADRAOJTQXE35H5KQGQMYJTFJECXJQNVCV";
const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET;

// 🚨 THE WASHER: Sanitizes objects to prevent the Next.js e.switch crash
const safeScVal = (scval: any) => {
  if (!scval) return scval;
  try {
    const b64 = typeof scval.toXDR === 'function' ? scval.toXDR("base64") : scval;
    return xdr.ScVal.fromXDR(b64, "base64");
  } catch (e) {
    console.error("XDR Washing failed", e);
    return scval;
  }
};

// Extract values safely
const extractScValValue = (val: any): any => {
  if (!val) return null;
  let hydrated = val;
  if (typeof val === 'string') {
    try { hydrated = xdr.ScVal.fromXDR(val, 'base64'); } catch (e) { return null; }
  }
  try {
    if (typeof hydrated.u64 === 'function') return hydrated.u64()?.toString();
    if (typeof hydrated.i128 === 'function') {
        const i128 = hydrated.i128();
        return (i128.lo?.toString() || i128.lo?.()?.toString() || "0");
    }
    if (typeof hydrated.str === 'function') return hydrated.str()?.toString();
    if (typeof hydrated.sym === 'function') return hydrated.sym()?.toString();
    if (typeof hydrated.address === 'function') return hydrated.address()?.toString();
    
    const raw = hydrated._value || hydrated;
    if (raw.u64) return raw.u64.toString();
    if (raw.i128) return (raw.i128.lo?.toString() || "0");
    if (raw.str) return raw.str.toString();
  } catch (e) { /* silent fail */ }
  return null;
};

export default function AuctionUI() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [highestBid, setHighestBid] = useState<number>(0);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isBidding, setIsBidding] = useState<boolean>(false);
  const [status, setStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [recentBids, setRecentBids] = useState<Array<{address: string, amount: number}>>([]);

  const server = new rpc.Server(RPC_URL);

  const [auctionData, setAuctionData] = useState({
    highestBid: 0,
    endTime: 0,
    userRefund: 0,
  });

  // Helper to extract signed XDR safely
  const getSignedXdr = (response: any): string => {
    console.log("Freighter response received:", response);
    if (typeof response === "string") return response;
    if (!response) throw new Error("Empty response from Freighter");
    
    // Check every possible property name used by various wallet versions
    const xdrStr = response.signed_tx || 
                   response.signedTransaction || 
                   response.signedTxXdr ||
                   response.signed_xdr ||
                   response.signedXdr ||
                   response.xdr ||
                   response.result?.xdr ||
                   response.result?.signed_tx;

    if (typeof xdrStr === "string") return xdrStr;
    
    console.error("Unknown Freighter response format:", response);
    throw new Error("Could not extract signed XDR. Check console for response structure.");
  };

  // 1️⃣ CONNECT WALLET
  const connectWallet = async () => {
    try {
      if (await isConnected()) {
        const access = await requestAccess();
        setWalletAddress(typeof access === 'string' ? access : (access as any).address || access);
      } else {
        alert("Please install the Freighter wallet extension!");
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  // 2️⃣ PLACE BID FUNCTION
  const placeBid = async () => {
    if (!walletAddress || !bidAmount) return;
    setIsBidding(true);

    try {
      const sourceAccount = await server.getAccount(walletAddress);
      const account = new Account(walletAddress, sourceAccount.sequenceNumber());
      const contract = new Contract(CONTRACT_ID);
      
      const bidderScVal = safeScVal(new Address(walletAddress).toScVal());
      // 🚨 FIX: Force explicit i128 type to match the contract and prevent Wasm traps
      const bidAmountStrokes = BigInt(Math.floor(Number(bidAmount) * 10000000));
      
      // 🚨 PRE-CHECK: Don't even try if the bid isn't higher
      if (Number(bidAmount) <= auctionData.highestBid) {
        throw new Error(`Your bid of ${bidAmount} XLM must be higher than the current bid of ${auctionData.highestBid} XLM!`);
      }

      const amountScVal = safeScVal(xdr.ScVal.scvI128(new xdr.Int128Parts({
        lo: xdr.Uint64.fromString((bidAmountStrokes & BigInt("0xFFFFFFFFFFFFFFFF")).toString()),
        hi: xdr.Int64.fromString((bidAmountStrokes >> BigInt(64)).toString()),
      })));

      let tx = new TransactionBuilder(account, {
        fee: "1000", 
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("bid", bidderScVal, amountScVal))
        .setTimeout(TimeoutInfinite)
        .build();

      const simulatedTx = await server.simulateTransaction(tx);
      if (!simulatedTx || rpc.Api.isSimulationError(simulatedTx)) {
        const errorMsg = (simulatedTx as any).error || "Simulation failed";
        console.error("Simulation Details:", simulatedTx);
        throw new Error(`Simulation failed: ${JSON.stringify(errorMsg)}`);
      }

      tx = rpc.assembleTransaction(tx, simulatedTx as any).build();
      const signedResponse = await signTransaction(tx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedXdr = getSignedXdr(signedResponse);
      
      const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
      if (response.status === "PENDING") {
        setBidAmount(""); 
        alert("Bid placed successfully!");
      }
    } catch (error: any) {
      console.error("Error placing bid:", error);
      alert(`Failed to place bid: ${error.message || error}`);
    } finally {
      setIsBidding(false);
    }
  };

  // 2.7️⃣ WITHDRAW REFUND FUNCTION
  const withdrawRefund = async () => {
    if (!walletAddress) return;
    setIsBidding(true);
    try {
      const sourceAccount = await server.getAccount(walletAddress);
      const account = new Account(walletAddress, sourceAccount.sequenceNumber());
      const contract = new Contract(CONTRACT_ID);
      
      const userScVal = safeScVal(new Address(walletAddress).toScVal());

      let tx = new TransactionBuilder(account, {
        fee: "1000",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("withdraw", userScVal))
        .setTimeout(TimeoutInfinite)
        .build();

      const simulatedTx = await server.simulateTransaction(tx);
      if (!simulatedTx || rpc.Api.isSimulationError(simulatedTx)) throw new Error("Simulation failed");
      
      tx = rpc.assembleTransaction(tx, simulatedTx as any).build();
      const signedResponse = await signTransaction(tx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedXdr = getSignedXdr(signedResponse);
      
      const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
      if (response.status === "PENDING") alert("Refund withdrawn!");
    } catch (error) {
      console.error("Withdrawal failed:", error);
      alert("Withdrawal failed.");
    } finally {
      setIsBidding(false);
    }
  };

  // 2.5️⃣ INITIALIZE AUCTION FUNCTION
  const initializeAuction = async () => {
    if (!walletAddress) return;
    setIsBidding(true);
    try {
      const sourceAccount = await server.getAccount(walletAddress);
      const account = new Account(walletAddress, sourceAccount.sequenceNumber());
      const contract = new Contract(CONTRACT_ID);
      
      const adminScVal = safeScVal(new Address(walletAddress).toScVal());
      const itemScVal = safeScVal(xdr.ScVal.scvString("BrewBid Special Roast"));
      const tokenScVal = safeScVal(new Address("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC").toScVal()); 
      const durationScVal = safeScVal(new ScInt(86400).toScVal());

      let tx = new TransactionBuilder(account, {
        fee: "1000", 
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("initialize", adminScVal, itemScVal, tokenScVal, durationScVal))
        .setTimeout(TimeoutInfinite)
        .build();

      const simulatedTx = await server.simulateTransaction(tx);
      
      if (simulatedTx && rpc.Api.isSimulationSuccess(simulatedTx)) {
        tx = rpc.assembleTransaction(tx, simulatedTx).build();
        const signedResponse = await signTransaction(tx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
        const signedXdr = getSignedXdr(signedResponse);
        
        const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
        if (response.status === "PENDING") alert("Auction Initialized! Refresh in a few seconds.");
      } else {
        console.error("Simulation Details:", simulatedTx);
        throw new Error("Init simulation failed. The contract might already be initialized.");
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      alert("Initialization failed. Check the console log.");
    } finally {
      setIsBidding(false);
    }
  };

  // 3️⃣ REAL-TIME EVENT LISTENER (POLLING)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchEvents = async () => {
      try {
        const latestLedger = await server.getLatestLedger();
        const response = await server.getEvents({
          startLedger: latestLedger.sequence - 10,
          filters: [
            {
              type: "contract",
              contractIds: [CONTRACT_ID],
              topics: [ [xdr.ScVal.scvSymbol("Bid").toXDR("base64") as any] ],
            },
          ],
        });
        if (response.events && response.events.length > 0) {
          const newBids: Array<{address: string, amount: number}> = [];
          response.events.forEach((event: any) => {
              const amount = extractScValValue(event.value);
              const address = extractScValValue(event.topic1) || "Unknown";
              if (amount) {
                  setHighestBid(Number(amount));
                  setAuctionData(prev => ({ ...prev, highestBid: Number(amount) }));
                  newBids.push({ address, amount: Number(amount) });
              }
          });
          setRecentBids(newBids.slice(-5).reverse());
        }
      } catch (error) { console.error("Error fetching events:", error); }
    };

    const fetchAuctionDetails = async () => {
      try {
        const contract = new Contract(CONTRACT_ID);
        const validFallback = "GCVAOJMF36XH5D5ZONRFIXOQTLAA7HFI3BWUMBMQKGPEKL2FJIRNFWPO";
        const dummyAccount = new Account(walletAddress || validFallback, "0");
        
        // Fetch End Time
        const getEndTimeTx = new TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
          .addOperation(contract.call("get_end_time"))
          .setTimeout(TimeoutInfinite).build();

        const simulatedTx = await server.simulateTransaction(getEndTimeTx);
        if (simulatedTx && rpc.Api.isSimulationSuccess(simulatedTx)) {
          const endTime = extractScValValue(simulatedTx.result?.retval);
          if (endTime) setAuctionData(prev => ({ ...prev, endTime: Number(endTime) }));
        }

        // Fetch User Refund
        if (walletAddress) {
          const userScVal = safeScVal(new Address(walletAddress).toScVal());
          const getRefundTx = new TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
            .addOperation(contract.call("get_refund", userScVal))
            .setTimeout(TimeoutInfinite).build();
          
          const refundSim = await server.simulateTransaction(getRefundTx);
          if (refundSim && rpc.Api.isSimulationSuccess(refundSim)) {
            const refund = extractScValValue(refundSim.result?.retval);
            if (refund !== null) setAuctionData(prev => ({ ...prev, userRefund: Number(refund) }));
          }
        }
      } catch (error) { console.error("Error fetching auction details:", error); }
    };

    if (CONTRACT_ID) {
      intervalId = setInterval(fetchEvents, 5000);
      fetchAuctionDetails();
      const detailsInterval = setInterval(fetchAuctionDetails, 30000); 
      return () => { clearInterval(intervalId); clearInterval(detailsInterval); };
    }
    
    const timerId = setInterval(() => {
      if (auctionData.endTime === 0) return;
      const now = Math.floor(Date.now() / 1000);
      const remaining = auctionData.endTime - now;
      if (remaining <= 0) {
        setTimeLeft("Auction Ended");
        setStatus("ended");
        return;
      }
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      setStatus("active");
    }, 1000);

    return () => { clearInterval(intervalId); clearInterval(timerId); };
  }, [walletAddress, auctionData.endTime]); 

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-center text-black">BrewBid Auction</h2>
      
      {!walletAddress ? (
        <button onClick={connectWallet} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
          Connect Freighter Wallet
        </button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
          
          <div className="p-4 bg-gray-100 rounded-lg text-center">
            <p className="text-gray-500 text-sm">Current Highest Bid</p>
            <p className="text-3xl font-bold text-gray-900">{auctionData.highestBid} <span className="text-sm font-normal text-gray-500 uppercase">XLM</span></p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-sm font-medium text-blue-600 mb-1 uppercase tracking-wider">Time Remaining</p>
            <p className="text-2xl font-mono font-bold text-blue-800">{timeLeft || "Calculating..."}</p>
          </div>

          <div className="flex space-x-2">
            <input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Bid amount in XLM" className="border p-2 rounded w-full text-black"/>
            <button onClick={placeBid} disabled={isBidding} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50">
              {isBidding ? "Bidding..." : "Bid"}
            </button>
          </div>

          {auctionData.userRefund > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
              <p className="text-orange-800 text-sm font-medium mb-2">You have a {auctionData.userRefund} XLM refund available!</p>
              <button onClick={withdrawRefund} disabled={isBidding} className="w-full bg-orange-500 text-white p-2 rounded hover:bg-orange-600 disabled:opacity-50">
                {isBidding ? "Withdrawing..." : "Withdraw Refund"}
              </button>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-gray-400 mb-2">Admin Section</p>
            <button onClick={initializeAuction} disabled={isBidding} className="w-full text-xs bg-gray-200 text-gray-600 p-2 rounded hover:bg-gray-300">
              (Re)Initialize Auction (24h)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}