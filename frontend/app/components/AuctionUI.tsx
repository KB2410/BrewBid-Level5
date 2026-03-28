/**
 * Auction UI Component
 * 
 * Main interface for interacting with the BrewBid auction smart contract.
 * Handles wallet connection, bid placement, refund withdrawal, and real-time data updates.
 * 
 * Features:
 * - Freighter wallet integration
 * - Real-time auction data polling (10-second intervals)
 * - Bid transaction construction and signing
 * - Automatic refund detection and withdrawal
 * - Professional UI with loading states and error handling
 */

"use client";

import {
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import {
  Account,
  Address,
  Contract,
  Networks,
  rpc,
  ScInt,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { useEffect, useState } from "react";

// Contract configuration
const CONTRACT_ID = "CCYN4CDGV2XMCCC5BZM5RNUFHGKMXJOGMCMB5B2665VU36PDQEU3SDEZ";
const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET;

/**
 * Sanitizes ScVal objects to prevent Next.js serialization crashes
 * Converts to XDR and back to ensure clean object structure
 */
const safeScVal = (scval: any) => {
  if (!scval) return scval;
  try {
    const b64 =
      typeof scval.toXDR === "function" ? scval.toXDR("base64") : scval;
    return xdr.ScVal.fromXDR(b64, "base64");
  } catch (e) {
    console.error("XDR Washing failed", e);
    return scval;
  }
};

/**
 * Extracts values from Stellar SDK ScVal objects
 * Handles i128, u64, strings, and addresses with proper BigInt conversion
 */
const extractScValValue = (val: any): any => {
  if (!val) return null;
  
  try {
    // Direct access to _value if it exists (already parsed)
    if (val._value !== undefined) {
      const v = val._value;
      
      // Handle i128 - check for _attributes first
      if (v._attributes) {
        const attrs = v._attributes;
        if (attrs.lo !== undefined || attrs.hi !== undefined) {
          // Get the actual values, not the getter functions
          const loVal = typeof attrs.lo === 'function' ? attrs.lo() : attrs.lo;
          const hiVal = typeof attrs.hi === 'function' ? attrs.hi() : attrs.hi;
          
          const lo = BigInt(loVal?.toString() || loVal || 0);
          const hi = BigInt(hiVal?.toString() || hiVal || 0);
          return (hi << BigInt(64)) | lo;
        }
      }
      
      // Handle i128 without _attributes
      if (v.lo !== undefined || v.hi !== undefined) {
        const loVal = typeof v.lo === 'function' ? v.lo() : v.lo;
        const hiVal = typeof v.hi === 'function' ? v.hi() : v.hi;
        
        const lo = BigInt(loVal?.toString() || loVal || 0);
        const hi = BigInt(hiVal?.toString() || hiVal || 0);
        return (hi << BigInt(64)) | lo;
      }
      
      // Handle u64
      if (typeof v === 'bigint' || typeof v === 'number') {
        return v.toString();
      }
      
      // Handle Uint8Array (strings)
      if (v instanceof Uint8Array) {
        return new TextDecoder().decode(v);
      }
      
      return v;
    }
    
    // Try XDR parsing if it's a string
    let hydrated = val;
    if (typeof val === "string") {
      try {
        hydrated = xdr.ScVal.fromXDR(val, "base64");
      } catch (e) {
        return null;
      }
    }
    
    // Try method-based extraction
    if (typeof hydrated.u64 === "function") return hydrated.u64()?.toString();
    if (typeof hydrated.str === "function") return hydrated.str()?.toString();
    if (typeof hydrated.sym === "function") return hydrated.sym()?.toString();
    
    // Handle address
    if (typeof hydrated.address === "function") {
      const addr = hydrated.address();
      if (typeof addr === "string") return addr;
      if (addr && typeof addr.toString === "function") {
        return addr.toString();
      }
      return addr;
    }
    
  } catch (e) {
    console.error("Error extracting ScVal:", e, val);
  }
  return null;
};

export default function AuctionUI() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isBidding, setIsBidding] = useState<boolean>(false);
  const [status, setStatus] = useState("active");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [itemName, setItemName] = useState("BrewBid Special Roast");

  const server = new rpc.Server(RPC_URL);

  const [auctionData, setAuctionData] = useState({
    highestBid: 0,
    endTime: 0,
    userRefund: 0,
    currentYield: 0,
    accumulatedInterest: 0,
  });

  // Helper to extract signed XDR safely
  const getSignedXdr = (response: any): string => {
    if (typeof response === "string") return response;
    if (!response) throw new Error("Empty response from Freighter");
    const xdrStr =
      response.signed_tx ||
      response.signedTransaction ||
      response.signedTxXdr ||
      response.signed_xdr ||
      response.signedXdr ||
      response.xdr ||
      response.result?.xdr ||
      response.result?.signed_tx;
    if (typeof xdrStr === "string") return xdrStr;
    throw new Error("Could not extract signed XDR.");
  };

  /**
   * Connects to user's Freighter wallet
   * Handles errors gracefully with user-friendly messages
   */
  const connectWallet = async () => {
    try {
      if (await isConnected()) {
        const access = await requestAccess();
        setWalletAddress(
          typeof access === "string"
            ? access
            : (access as any).address || access,
        );
      } else {
        alert("Please install the Freighter wallet extension!");
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      // User-friendly error handling based on feedback
      if (err.message?.includes("User declined")) {
        alert("Wallet connection was cancelled. Please try again when ready.");
      } else {
        alert("Failed to connect wallet. Please ensure Freighter is installed and unlocked.");
      }
    }
  };

  /**
   * Places a bid in the auction using gasless transactions
   * The sponsor wallet pays the transaction fees via Fee Bump
   * 
   * Flow:
   * 1. Build and simulate transaction
   * 2. User signs with Freighter (no fee required from user)
   * 3. Send signed XDR to relay API
   * 4. Relay wraps in Fee Bump and submits
   */
  const placeBid = async () => {
    console.log("=== Place Bid Clicked ===");
    console.log("Wallet Address:", walletAddress);
    console.log("Bid Amount:", bidAmount);
    console.log("Current Highest Bid:", auctionData.highestBid);
    console.log("Is Bidding:", isBidding);
    console.log("Status:", status);
    
    if (!walletAddress || !bidAmount) {
      console.log("❌ Early return: Missing wallet or bid amount");
      return;
    }
    
    // Validate bid amount
    if (Number(bidAmount) <= auctionData.highestBid) {
      console.log("❌ Bid too low");
      alert(`Bid must be higher than current bid of ${auctionData.highestBid} XLM`);
      return;
    }
    
    console.log("✅ Validation passed, starting bid process...");
    setIsBidding(true);
    try {
      // Step 1: Build the transaction
      const sourceAccount = await server.getAccount(walletAddress);
      const account = new Account(
        walletAddress,
        sourceAccount.sequenceNumber(),
      );
      const contract = new Contract(CONTRACT_ID);
      const bidderScVal = safeScVal(new Address(walletAddress).toScVal());
      const bidAmountStrokes = BigInt(Math.floor(Number(bidAmount) * 10000000));

      const amountScVal = safeScVal(
        xdr.ScVal.scvI128(
          new xdr.Int128Parts({
            lo: xdr.Uint64.fromString(
              (bidAmountStrokes & BigInt("0xFFFFFFFFFFFFFFFF")).toString(),
            ),
            hi: xdr.Int64.fromString(
              (bidAmountStrokes >> BigInt(64)).toString(),
            ),
          }),
        ),
      );

      // Build transaction with minimal fee (sponsor will pay the actual fee)
      let tx = new TransactionBuilder(account, {
        fee: "100", // Minimal fee - sponsor will cover the real cost
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("bid", bidderScVal, amountScVal))
        .setTimeout(TimeoutInfinite)
        .build();

      // Step 2: Simulate transaction to get auth and resource requirements
      const simulatedTx = await server.simulateTransaction(tx);
      if (!simulatedTx || rpc.Api.isSimulationError(simulatedTx)) {
        throw new Error("Transaction simulation failed. Please check your bid amount and try again.");
      }

      // Assemble transaction with simulation results
      tx = rpc.assembleTransaction(tx, simulatedTx).build();
      
      // Step 3: Request user signature from Freighter (user doesn't pay fees!)
      const signedResponse = await signTransaction(tx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      
      const signedXdr = getSignedXdr(signedResponse);
      
      // Step 4: Send signed transaction to relay API for fee bump
      const relayResponse = await fetch("/api/relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signedXdr }),
      });

      const relayData = await relayResponse.json();

      if (!relayResponse.ok || !relayData.success) {
        throw new Error(relayData.error || "Failed to relay transaction");
      }

      // Success! Transaction was submitted with sponsor paying fees
      setBidAmount("");
      alert(`✅ Bid placed successfully! (Gasless - fees paid by sponsor)\nTransaction: ${relayData.hash}`);
      
      // Wait for transaction to be processed, then refresh
      setTimeout(() => {
        fetchAuctionDetails();
      }, 3000);

    } catch (error: any) {
      console.error("Bid placement error:", error);
      
      // User-friendly error messages based on feedback
      if (error.message?.includes("User declined")) {
        alert("❌ Transaction was cancelled. Your bid was not placed.");
      } else if (error.message?.includes("Bid must be higher")) {
        alert("❌ Your bid must be higher than the current highest bid.");
      } else if (error.message?.includes("Auction has already ended")) {
        alert("❌ This auction has ended. No more bids can be placed.");
      } else if (error.message?.includes("insufficient balance")) {
        alert("❌ Insufficient XLM balance. Please fund your wallet and try again.");
      } else if (error.message?.includes("Sponsor wallet not configured")) {
        alert("❌ Gasless transactions are not configured. Please contact support.");
      } else {
        alert(`❌ Bid failed: ${error.message || "Unknown error. Please try again."}`);
      }
    } finally {
      setIsBidding(false);
    }
  };

  /**
   * Withdraws refund for outbid users using gasless transactions
   * The sponsor wallet pays the transaction fees via Fee Bump
   */
  const withdrawRefund = async () => {
    if (!walletAddress) return;
    setIsBidding(true);
    try {
      // Step 1: Build the transaction
      const sourceAccount = await server.getAccount(walletAddress);
      const account = new Account(
        walletAddress,
        sourceAccount.sequenceNumber(),
      );
      const contract = new Contract(CONTRACT_ID);
      const userScVal = safeScVal(new Address(walletAddress).toScVal());
      
      // Build transaction with minimal fee (sponsor will pay the actual fee)
      let tx = new TransactionBuilder(account, {
        fee: "100", // Minimal fee - sponsor will cover the real cost
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("withdraw", userScVal))
        .setTimeout(TimeoutInfinite)
        .build();
      
      // Step 2: Simulate transaction
      const simulatedTx = await server.simulateTransaction(tx);
      if (!simulatedTx || rpc.Api.isSimulationError(simulatedTx)) {
        throw new Error("Withdrawal simulation failed. Please try again.");
      }
      
      // Assemble transaction with simulation results
      tx = rpc.assembleTransaction(tx, simulatedTx).build();
      
      // Step 3: Request user signature from Freighter (user doesn't pay fees!)
      const signedResponse = await signTransaction(tx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      const signedXdr = getSignedXdr(signedResponse);
      
      // Step 4: Send signed transaction to relay API for fee bump
      const relayResponse = await fetch("/api/relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signedXdr }),
      });

      const relayData = await relayResponse.json();

      if (!relayResponse.ok || !relayData.success) {
        throw new Error(relayData.error || "Failed to relay transaction");
      }

      // Success! Transaction was submitted with sponsor paying fees
      alert(`✅ Refund withdrawn successfully! (Gasless - fees paid by sponsor)\nTransaction: ${relayData.hash}`);
      
      // Refresh auction data to update refund balance
      setTimeout(() => {
        fetchAuctionDetails();
      }, 3000);

    } catch (error: any) {
      console.error("Withdrawal error:", error);
      
      // User-friendly error messages
      if (error.message?.includes("User declined")) {
        alert("❌ Withdrawal was cancelled.");
      } else if (error.message?.includes("No funds to withdraw")) {
        alert("❌ You have no refund available to withdraw.");
      } else {
        alert(`❌ Withdrawal failed: ${error.message || "Unknown error. Please try again."}`);
      }
    } finally {
      setIsBidding(false);
    }
  };

  const fetchAuctionDetails = async () => {
    try {
      const contract = new Contract(CONTRACT_ID);
      const validFallback =
        "GCVAOJMF36XH5D5ZONRFIXOQTLAA7HFI3BWUMBMQKGPEKL2FJIRNFWPO";
      const dummyAccount = new Account(walletAddress || validFallback, "0");

      const getHighestBidTx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("get_highest_bid"))
        .setTimeout(TimeoutInfinite)
        .build();
      const highestBidSim = await server.simulateTransaction(getHighestBidTx);
      console.log("Highest bid simulation result:", highestBidSim);
      if (highestBidSim && rpc.Api.isSimulationSuccess(highestBidSim)) {
        console.log("Simulation success, retval:", highestBidSim.result?.retval);
        const highestBid = extractScValValue(highestBidSim.result?.retval);
        console.log("Highest bid from contract (raw):", highestBid, typeof highestBid);
        if (highestBid !== null && highestBid !== undefined) {
          // Convert BigInt to number safely
          const bidValue = typeof highestBid === 'bigint' ? Number(highestBid) : Number(highestBid);
          const bidInXLM = bidValue / 10000000;
          console.log("Bid value:", bidValue, "Bid in XLM:", bidInXLM);
          console.log("Setting auction data with highestBid:", bidInXLM);
          setAuctionData((prev) => {
            const newData = {
              ...prev,
              highestBid: bidInXLM,
            };
            console.log("New auction data:", newData);
            return newData;
          });
        } else {
          console.log("Highest bid is null or undefined");
        }
      } else {
        console.error("Simulation failed or error:", highestBidSim);
      }

      const getEndTimeTx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("get_end_time"))
        .setTimeout(TimeoutInfinite)
        .build();
      const simulatedTx = await server.simulateTransaction(getEndTimeTx);
      if (simulatedTx && rpc.Api.isSimulationSuccess(simulatedTx)) {
        const endTime = extractScValValue(simulatedTx.result?.retval);
        console.log("End time from contract:", endTime);
        if (endTime)
          setAuctionData((prev) => ({ ...prev, endTime: Number(endTime) }));
      }

      const getItemNameTx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("get_item_name"))
        .setTimeout(TimeoutInfinite)
        .build();
      const itemSim = await server.simulateTransaction(getItemNameTx);
      if (itemSim && rpc.Api.isSimulationSuccess(itemSim)) {
        const name = extractScValValue(itemSim.result?.retval);
        console.log("Item name from contract:", name);
        if (name) setItemName(name);
      }

      if (walletAddress) {
        const userScVal = safeScVal(new Address(walletAddress).toScVal());
        const getRefundTx = new TransactionBuilder(dummyAccount, {
          fee: "100",
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(contract.call("get_refund", userScVal))
          .setTimeout(TimeoutInfinite)
          .build();
        const refundSim = await server.simulateTransaction(getRefundTx);
        if (refundSim && rpc.Api.isSimulationSuccess(refundSim)) {
          const refund = extractScValValue(refundSim.result?.retval);
          if (refund !== null)
            setAuctionData((prev) => ({
              ...prev,
              userRefund: Number(refund) / 10000000,
            }));
        }
      }

      // NEW: Fetch yield-generation data
      // Get current yield preview
      const getYieldTx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("preview_current_yield"))
        .setTimeout(TimeoutInfinite)
        .build();
      const yieldSim = await server.simulateTransaction(getYieldTx);
      if (yieldSim && rpc.Api.isSimulationSuccess(yieldSim)) {
        const currentYield = extractScValValue(yieldSim.result?.retval);
        if (currentYield !== null) {
          const yieldValue = typeof currentYield === 'bigint' ? Number(currentYield) : Number(currentYield);
          setAuctionData((prev) => ({
            ...prev,
            currentYield: yieldValue / 10000000,
          }));
        }
      }

      // Get accumulated interest
      const getInterestTx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("get_accumulated_interest"))
        .setTimeout(TimeoutInfinite)
        .build();
      const interestSim = await server.simulateTransaction(getInterestTx);
      if (interestSim && rpc.Api.isSimulationSuccess(interestSim)) {
        const accumulatedInterest = extractScValValue(interestSim.result?.retval);
        if (accumulatedInterest !== null) {
          const interestValue = typeof accumulatedInterest === 'bigint' ? Number(accumulatedInterest) : Number(accumulatedInterest);
          setAuctionData((prev) => ({
            ...prev,
            accumulatedInterest: interestValue / 10000000,
          }));
        }
      }
    } catch (e) {
      console.error("Error fetching auction details:", e);
    }
  };

  useEffect(() => {
    let detailsInterval: NodeJS.Timeout;
    let timerId: NodeJS.Timeout;
    
    // Fetch immediately on mount
    console.log("Fetching auction data on mount...");
    fetchAuctionDetails();
    
    // Set up intervals
    detailsInterval = setInterval(() => {
      console.log("Fetching auction details...");
      fetchAuctionDetails();
    }, 10000);
    
    timerId = setInterval(() => {
      if (auctionData.endTime === 0) return;
      const now = Math.floor(Date.now() / 1000);
      const remaining = auctionData.endTime - now;
      if (remaining <= 0) {
        setTimeLeft("Auction Ended");
        setStatus("ended");
        return;
      }
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      setTimeLeft(`${h}h ${m}m ${s}s`);
      setStatus("active");
    }, 1000);
    
    return () => {
      clearInterval(detailsInterval);
      clearInterval(timerId);
    };
  }, [walletAddress, auctionData.endTime]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-xl">☕</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  BrewBid <span className="text-blue-600">Auction</span>
                </h1>
                <p className="text-xs text-gray-500">Stellar Network</p>
              </div>
            </div>
            
            {walletAddress ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-mono text-gray-700">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Auction Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                    Live Auction
                  </div>
                  {/* NEW: Yield-Generating Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-sm font-medium shadow-lg">
                    <span>💰</span>
                    <span>Yield-Generating</span>
                  </div>
                </div>
                <h2 className="text-4xl font-bold mb-2">
                  {itemName}
                </h2>
                <p className="text-lg text-blue-100">
                  Premium Ethiopian Single Origin Coffee
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <p className="text-sm font-medium text-blue-700 mb-2">Current Bid</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {auctionData.highestBid}
                      </span>
                      <span className="text-xl font-semibold text-blue-600">XLM</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                    <p className="text-sm font-medium text-purple-700 mb-2">Time Remaining</p>
                    <div className="text-3xl font-bold text-gray-900 font-mono">
                      {timeLeft || "Loading..."}
                    </div>
                    {status === "ended" && (
                      <p className="text-sm text-red-600 font-medium mt-2">Auction has ended</p>
                    )}
                  </div>

                  {/* NEW: Yield Generated Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-6 border border-green-200">
                    <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                      <span></span>
                      <span>Yield Generated</span>
                    </p>
                    <div className="flex flex-col mb-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {(auctionData.currentYield + auctionData.accumulatedInterest).toFixed(5)}
                      </span>
                     <span className="text-sm font-semibold text-green-600 mt-1">XLM</span>
                    </div>
                    <p className="text-xs text-green-700 mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      <span>Seller bonus</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Choose BrewBid</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Secure & Transparent</h4>
                    <p className="text-xs text-gray-600">Smart contract-powered auctions on Stellar blockchain</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Instant Refunds</h4>
                    <p className="text-xs text-gray-600">Automatic refund system when outbid</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Low Fees</h4>
                    <p className="text-xs text-gray-600">Minimal transaction costs on Stellar network</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Easy to Use</h4>
                    <p className="text-xs text-gray-600">Simple wallet connection and bidding process</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Bid Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Place Your Bid
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bid Amount (XLM)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-3.5 text-sm font-medium text-gray-500">
                      XLM
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Minimum bid: {auctionData.highestBid + 1} XLM
                  </p>
                </div>

                <button
                  onClick={() => {
                    console.log("🔘 Place Bid button clicked!");
                    placeBid();
                  }}
                  disabled={isBidding || !walletAddress || status === "ended"}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  {isBidding ? "Processing..." : "Place Bid"}
                </button>

                {!walletAddress && (
                  <p className="text-center text-xs text-gray-500 mt-3">
                    Connect your wallet to start bidding
                  </p>
                )}
              </div>

              {/* NEW: Principal Protection Message */}
              {walletAddress && auctionData.userRefund === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span>🛡️</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        Your Bid is Protected
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        If outbid, you'll receive your <strong>full principal back</strong>. 
                        The yield goes to the seller as additional revenue.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Card */}
              {auctionData.userRefund > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">💰</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Refund Available
                      </h3>
                      <p className="text-xs text-gray-600">
                        You were outbid
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">
                    <span className="text-2xl font-bold text-green-700">
                      {auctionData.userRefund} XLM
                    </span>
                  </p>
                  <button
                    onClick={withdrawRefund}
                    disabled={isBidding}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Withdraw Refund
                  </button>
                </div>
              )}

              {/* Info Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      Powered by Stellar
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Decentralized auctions with Soroban smart contracts. Fast, secure, and transparent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              BrewBid - Decentralized Auction Platform on Stellar
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
