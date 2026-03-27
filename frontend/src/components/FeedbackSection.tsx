import { ArrowRight, ExternalLink, MessageSquareShare } from "lucide-react";

export default function FeedbackSection() {
  const GOOGLE_FORM_URL = "#"; // USER: Replace with your actual Google Form URL

  return (
    <div className="mt-12 glass-card rounded-3xl p-8 border border-orange-500/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <MessageSquareShare className="w-24 h-24 text-orange-400" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-md">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center">
            <span className="bg-orange-500 text-black text-[10px] px-2 py-0.5 rounded mr-3 uppercase tracking-tighter">
              Level 5 Requirement
            </span>
            Help us reach MVP!
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            BrewBid is currently in public testnet. Your feedback directly
            impacts our development roadmap. Rate your experience and suggest
            features to win rewards.
          </p>
        </div>

        <a
          href={GOOGLE_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-full font-bold text-sm transition-all group"
        >
          <span>Share Feedback</span>
          <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </a>
      </div>
    </div>
  );
}
