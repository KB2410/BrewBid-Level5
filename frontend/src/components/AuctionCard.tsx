import { Award, Timer, TrendingUp } from "lucide-react";

interface AuctionCardProps {
  highestBid: number;
  timeLeft: string;
  status: string;
  itemName: string;
}

export default function AuctionCard({
  highestBid,
  timeLeft,
  status,
  itemName,
}: AuctionCardProps) {
  return (
    <div className="glass-card rounded-3xl p-8 mb-8 relative overflow-hidden group transition-all duration-500 hover:scale-[1.01]">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <TrendingUp className="w-32 h-32 text-orange-500" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center space-x-2 mb-6">
          <span className="px-3 py-1 bg-orange-500/10 text-orange-500 text-xs font-bold rounded-full border border-orange-500/20 uppercase tracking-widest">
            {status === "active" ? "Live Auction" : "Auction Ended"}
          </span>
          <span className="text-gray-500 text-xs">•</span>
          <span className="text-gray-400 text-xs font-medium">
            BrewBid Special Roast #001
          </span>
        </div>

        <h2 className="text-4xl font-bold mb-8 tracking-tight">{itemName}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center text-gray-400 text-xs mb-2 uppercase tracking-wide">
              <Award className="w-3 h-3 mr-1" />
              Highest Bid
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-white">
                {highestBid}
              </span>
              <span className="text-lg font-medium text-orange-500">XLM</span>
            </div>
          </div>

          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center text-gray-400 text-xs mb-2 uppercase tracking-wide">
              <Timer className="w-3 h-3 mr-1" />
              Time Remaining
            </div>
            <div className="text-4xl font-mono font-bold text-blue-400 tracking-tight">
              {timeLeft || "--:--:--"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
