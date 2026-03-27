import { Coffee, LayoutGrid, Wallet } from "lucide-react";

interface HeaderProps {
  address: string | null;
  onConnect: () => void;
}

export default function Header({ address, onConnect }: HeaderProps) {
  return (
    <header className="flex justify-between items-center p-6 border-b border-white/5 backdrop-blur-xl bg-black/60 sticky top-0 z-50">
      <div className="flex items-center space-x-2">
        <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-2 rounded-xl shadow-lg shadow-orange-500/20">
          <Coffee className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">
            BrewBid
          </h1>
          <p className="text-[10px] text-orange-500 font-mono uppercase tracking-widest leading-none">
            Stellar MVP
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onConnect}
        className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm ${
          address
            ? "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
            : "bg-white text-black hover:bg-gray-200 shadow-xl shadow-white/10"
        }`}
      >
        <Wallet className="w-4 h-4" />
        <span>
          {address
            ? `${address.slice(0, 4)}...${address.slice(-4)}`
            : "Connect Wallet"}
        </span>
      </button>
    </header>
  );
}
