/**
 * Auction Data Hook
 * 
 * Custom hook for fetching and managing real-time auction state.
 * Implements 10-second polling for live updates.
 * 
 * Features:
 * - Automatic data fetching on mount
 * - 10-second interval polling
 * - Highest bid tracking
 * - End time monitoring
 * - Item name retrieval
 * - User refund balance checking
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Account, Address, Contract, Networks, rpc, TimeoutInfinite, TransactionBuilder, xdr } from "@stellar/stellar-sdk";

interface AuctionData {
  highestBid: number;
  endTime: number;
  userRefund: number;
  itemName: string;
}

interface UseAuctionDataProps {
  contractId: string;
  rpcUrl: string;
  walletAddress: string | null;
}

/**
 * Extracts values from Stellar SDK ScVal objects
 */
const extractScValValue = (val: any): any => {
  if (!val) return null;
  
  try {
    if (val._value !== undefined) {
      const v = val._value;
      
      // Handle i128
      if (v._attributes) {
        const attrs = v._attributes;
        if (attrs.lo !== undefined || attrs.hi !== undefined) {
          const loVal = typeof attrs.lo === 'function' ? attrs.lo() : attrs.lo;
          const hiVal = typeof attrs.hi === 'function' ? attrs.hi() : attrs.hi;
          
          const lo = BigInt(loVal?.toString() || loVal || 0);
          const hi = BigInt(hiVal?.toString() || hiVal || 0);
          return (hi << BigInt(64)) | lo;
        }
      }
      
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

/**
 * Hook for managing auction data with real-time updates
 * 
 * @param contractId - Soroban contract address
 * @param rpcUrl - Stellar RPC endpoint
 * @param walletAddress - Connected user's wallet address
 * @returns Auction data and loading state
 */
export function useAuctionData({ contractId, rpcUrl, walletAddress }: UseAuctionDataProps) {
  const [auctionData, setAuctionData] = useState<AuctionData>({
    highestBid: 0,
    endTime: 0,
    userRefund: 0,
    itemName: "Loading...",
  });
  const [isLoading, setIsLoading] = useState(true);

  const server = new rpc.Server(rpcUrl);

  /**
   * Fetches current auction state from the smart contract
   * Polls: highest bid, end time, item name, and user refund balance
   */
  const fetchAuctionDetails = useCallback(async () => {
    try {
      const contract = new Contract(contractId);
      const validFallback = "GCVAOJMF36XH5D5ZONRFIXOQTLAA7HFI3BWUMBMQKGPEKL2FJIRNFWPO";
      const dummyAccount = new Account(walletAddress || validFallback, "0");

      // Fetch highest bid
      const getHighestBidTx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_highest_bid"))
        .setTimeout(TimeoutInfinite)
        .build();
      
      const highestBidSim = await server.simulateTransaction(getHighestBidTx);
      if (highestBidSim && rpc.Api.isSimulationSuccess(highestBidSim)) {
        const highestBid = extractScValValue(highestBidSim.result?.retval);
        if (highestBid !== null && highestBid !== undefined) {
          const bidValue = typeof highestBid === 'bigint' ? Number(highestBid) : Number(highestBid);
          const bidInXLM = bidValue / 10000000;
          setAuctionData((prev) => ({ ...prev, highestBid: bidInXLM }));
        }
      }

      // Fetch end time
      const getEndTimeTx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_end_time"))
        .setTimeout(TimeoutInfinite)
        .build();
      
      const simulatedTx = await server.simulateTransaction(getEndTimeTx);
      if (simulatedTx && rpc.Api.isSimulationSuccess(simulatedTx)) {
        const endTime = extractScValValue(simulatedTx.result?.retval);
        if (endTime) setAuctionData((prev) => ({ ...prev, endTime: Number(endTime) }));
      }

      // Fetch item name
      const getItemNameTx = new TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_item_name"))
        .setTimeout(TimeoutInfinite)
        .build();
      
      const itemSim = await server.simulateTransaction(getItemNameTx);
      if (itemSim && rpc.Api.isSimulationSuccess(itemSim)) {
        const name = extractScValValue(itemSim.result?.retval);
        if (name) setAuctionData((prev) => ({ ...prev, itemName: name }));
      }

      // Fetch user refund if wallet connected
      if (walletAddress) {
        const userScVal = new Address(walletAddress).toScVal();
        const getRefundTx = new TransactionBuilder(dummyAccount, {
          fee: "100",
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(contract.call("get_refund", userScVal))
          .setTimeout(TimeoutInfinite)
          .build();
        
        const refundSim = await server.simulateTransaction(getRefundTx);
        if (refundSim && rpc.Api.isSimulationSuccess(refundSim)) {
          const refund = extractScValValue(refundSim.result?.retval);
          if (refund !== null) {
            setAuctionData((prev) => ({
              ...prev,
              userRefund: Number(refund) / 10000000,
            }));
          }
        }
      }

      setIsLoading(false);
    } catch (e) {
      console.error("Error fetching auction details:", e);
      setIsLoading(false);
    }
  }, [contractId, rpcUrl, walletAddress]);

  // Set up polling on mount and when wallet changes
  useEffect(() => {
    // Fetch immediately
    fetchAuctionDetails();
    
    // Set up 10-second polling interval
    const interval = setInterval(() => {
      fetchAuctionDetails();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchAuctionDetails]);

  return { auctionData, isLoading, refetch: fetchAuctionDetails };
}
