/**
 * Wallet Connection Component
 * 
 * Handles Freighter wallet integration for user authentication.
 * Provides connection status and wallet address display.
 */

"use client";

import { isConnected, requestAccess } from "@stellar/freighter-api";
import { useState, useEffect } from "react";

interface WalletConnectProps {
  onConnect: (address: string) => void;
  walletAddress: string | null;
}

export default function WalletConnect({ onConnect, walletAddress }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Check if Freighter is installed
      const connected = await isConnected();
      
      if (!connected) {
        setError("Please install the Freighter wallet extension");
        setIsConnecting(false);
        return;
      }

      // Request access to user's wallet
      const access = await requestAccess();
      const address = typeof access === "string" ? access : (access as any).address || access;
      
      onConnect(address);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
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
          disabled={isConnecting}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
