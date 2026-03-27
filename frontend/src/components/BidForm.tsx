import { Loader2, Send } from "lucide-react";

interface BidFormProps {
  bidAmount: string;
  setBidAmount: (value: string) => void;
  onBid: () => void;
  isBidding: boolean;
  highestBid: number;
}

export default function BidForm({
  bidAmount,
  setBidAmount,
  onBid,
  isBidding,
  highestBid,
}: BidFormProps) {
  const isTooLow = bidAmount !== "" && Number(bidAmount) <= highestBid;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider">
          Place Your Bid
        </h3>
        <span className="text-[10px] text-gray-500 font-medium">
          Min. Increment: 1 XLM
        </span>
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={`Enter amount > ${highestBid}`}
            className={`w-full bg-white/5 border-2 ${
              isTooLow
                ? "border-red-500/50"
                : "border-white/10 group-hover:border-white/20"
            } rounded-xl pl-4 pr-16 py-4 text-xl font-bold transition-all focus:outline-none focus:border-orange-500/50 text-white placeholder:text-gray-600`}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 font-bold pointer-events-none">
            XLM
          </div>
        </div>

        {isTooLow && (
          <p className="text-red-400 text-[10px] uppercase font-bold tracking-tight px-1">
            ⚠️ Bid must be higher than the current top bid
          </p>
        )}

        <button
          type="button"
          onClick={onBid}
          disabled={isBidding || !bidAmount || isTooLow}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-black font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 active:scale-[0.98]"
        >
          {isBidding ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Broadcasting...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Confirm Bid</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
