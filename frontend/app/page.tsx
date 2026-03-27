import AuctionUI from "./components/AuctionUI";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl text-center space-y-8">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          BrewBid <span className="text-blue-600">Auction</span> ☕
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A real-time decentralized auction platform built on the Stellar
          network. Connect your Freighter wallet to place bids securely via
          Soroban smart contracts.
        </p>

        {/* Render your Stellar UI here */}
        <AuctionUI />
      </div>
    </main>
  );
}
