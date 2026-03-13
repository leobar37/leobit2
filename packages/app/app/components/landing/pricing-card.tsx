import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  onCtaClick?: () => void;
}

export function PricingCard({
  title,
  price,
  period = "",
  description,
  features,
  cta,
  highlighted = false,
  onCtaClick
}: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-2xl p-8 ${
        highlighted
          ? "bg-gradient-to-b from-orange-500/20 via-orange-500/10 to-slate-800 border-2 border-orange-500 shadow-lg shadow-orange-500/20"
          : "bg-slate-800/50 border border-slate-700 hover:border-slate-600"
      } transition-all duration-300`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Mas popular
          </span>
        </div>
      )}

      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-4xl font-bold ${highlighted ? "text-orange-400" : "text-white"}`}>
          {price}
        </span>
        <span className="text-slate-400">{period}</span>
      </div>
      <p className="text-slate-400 mb-6">{description}</p>

      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-slate-300">
            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${highlighted ? "text-orange-500" : "text-green-500"}`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onCtaClick}
        className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 ${
          highlighted
            ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            : "bg-slate-700 hover:bg-slate-600 text-white"
        }`}
      >
        {cta}
      </Button>
    </motion.div>
  );
}
