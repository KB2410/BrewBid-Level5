import { AnimatePresence, motion } from "framer-motion";
import { User, Zap, TrendingUp } from "lucide-react";

interface LiveFeedProps {
  recentBids: Array<{ address: string; amount: number }>;
}

export default function LiveFeed({ recentBids }: LiveFeedProps) {
  return (
    <div className="glass-card rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Live Activity
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] text-gray-400 uppercase">
            Live Connection
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {recentBids.length > 0 ? (
            recentBids.map((bid, idx) => (
              <motion.div
                key={`${bid.address}-${bid.amount}-${idx}`}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                    <User className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono text-gray-400">
                      {bid.address.slice(0, 6)}...{bid.address.slice(-4)}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                      Placed a bid
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">
                    {bid.amount} XLM
                  </p>
                  <p className="text-[9px] text-green-400 uppercase font-bold tracking-tighter">
                    Verified
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-2">
              <TrendingUp className="w-8 h-8 opacity-20" />
              <p className="text-xs uppercase tracking-widest font-medium opacity-50">
                Waiting for bids...
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


