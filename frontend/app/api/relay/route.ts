/**
 * Fee Bump Transaction Relayer API Route
 * 
 * This endpoint enables gasless transactions by wrapping user-signed transactions
 * in a Fee Bump transaction paid for by a sponsor wallet.
 * 
 * Flow:
 * 1. Receives user's signed transaction XDR
 * 2. Wraps it in a Fee Bump transaction
 * 3. Signs with sponsor wallet
 * 4. Submits to Stellar network
 * 
 * Security: The sponsor wallet only pays fees, it cannot modify the user's transaction
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  Networks,
  TransactionBuilder,
  rpc,
  Transaction,
  FeeBumpTransaction,
} from "@stellar/stellar-sdk";

// Network configuration
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;

// Initialize RPC server
const server = new rpc.Server(RPC_URL);

/**
 * POST /api/relay
 * 
 * Request body:
 * {
 *   "signedXdr": "base64-encoded signed transaction XDR"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "hash": "transaction hash",
 *   "status": "PENDING" | "SUCCESS" | "ERROR"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { signedXdr } = body;

    // Validate input
    if (!signedXdr || typeof signedXdr !== "string") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing or invalid signedXdr parameter" 
        },
        { status: 400 }
      );
    }

    // Validate sponsor secret key is configured
    const sponsorSecretKey = process.env.SPONSOR_SECRET_KEY;
    if (!sponsorSecretKey) {
      console.error("SPONSOR_SECRET_KEY not configured in environment variables");
      return NextResponse.json(
        { 
          success: false, 
          error: "Server configuration error: Sponsor wallet not configured" 
        },
        { status: 500 }
      );
    }

    // Initialize sponsor keypair
    let sponsorKeypair: Keypair;
    try {
      sponsorKeypair = Keypair.fromSecret(sponsorSecretKey);
    } catch (error) {
      console.error("Invalid SPONSOR_SECRET_KEY:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Server configuration error: Invalid sponsor wallet key" 
        },
        { status: 500 }
      );
    }

    // Decode the user's signed transaction
    let innerTransaction: Transaction;
    try {
      innerTransaction = TransactionBuilder.fromXDR(
        signedXdr,
        NETWORK_PASSPHRASE
      ) as Transaction;
    } catch (error: any) {
      console.error("Failed to decode transaction XDR:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid transaction XDR: ${error.message}` 
        },
        { status: 400 }
      );
    }

    // Verify the inner transaction is properly signed
    if (!innerTransaction.signatures || innerTransaction.signatures.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Transaction must be signed by the user before relaying" 
        },
        { status: 400 }
      );
    }

    // Build the Fee Bump transaction
    // The sponsor pays a higher fee to cover both the inner transaction and the fee bump
    const baseFee = "1000"; // Base fee in stroops
    const feeBumpFee = "2000"; // Fee bump fee (must be higher than inner transaction fee)
    
    let feeBumpTransaction: FeeBumpTransaction;
    try {
      feeBumpTransaction = TransactionBuilder.buildFeeBumpTransaction(
        sponsorKeypair,
        feeBumpFee,
        innerTransaction,
        NETWORK_PASSPHRASE
      );
    } catch (error: any) {
      console.error("Failed to build fee bump transaction:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to create fee bump transaction: ${error.message}` 
        },
        { status: 500 }
      );
    }

    // Sign the fee bump transaction with the sponsor's keypair
    feeBumpTransaction.sign(sponsorKeypair);

    // Submit the fee bump transaction to the network
    let response: rpc.Api.SendTransactionResponse;
    try {
      response = await server.sendTransaction(feeBumpTransaction);
    } catch (error: any) {
      console.error("Failed to submit transaction to network:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Network submission failed: ${error.message}` 
        },
        { status: 500 }
      );
    }

    // Check response status
    // Valid statuses: "PENDING", "DUPLICATE", "TRY_AGAIN_LATER", "ERROR"
    if (response.status === "PENDING" || response.status === "DUPLICATE") {
      return NextResponse.json({
        success: true,
        hash: response.hash,
        status: response.status,
        message: "Transaction submitted successfully. Sponsor wallet paid the fees.",
      });
    } else if (response.status === "ERROR") {
      // Transaction was rejected by the network
      const errorResult = response.errorResult?.result();
      console.error("Transaction error:", errorResult);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Transaction failed: ${errorResult?.toString() || "Unknown error"}`,
          hash: response.hash,
          status: response.status,
        },
        { status: 400 }
      );
    } else if (response.status === "TRY_AGAIN_LATER") {
      // Network is busy, client should retry
      return NextResponse.json(
        { 
          success: false, 
          error: "Network is busy. Please try again in a moment.",
          hash: response.hash,
          status: response.status,
        },
        { status: 503 }
      );
    } else {
      // Unexpected status
      return NextResponse.json(
        { 
          success: false, 
          error: `Unexpected transaction status: ${response.status}`,
          hash: response.hash,
          status: response.status,
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    // Catch-all error handler
    console.error("Relay API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error.message || "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/relay
 * 
 * Health check endpoint
 */
export async function GET() {
  const sponsorConfigured = !!process.env.SPONSOR_SECRET_KEY;
  
  return NextResponse.json({
    service: "BrewBid Fee Bump Relayer",
    status: "online",
    sponsorConfigured,
    network: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
  });
}
