import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
}

export function PricingCard({
  title,
  price,
  period = "",
  description,
  features,
  cta,
  ctaHref,
  highlighted = false,
}: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-2xl p-8 ${
        highlighted
          ? "bg-orange-50 border border-orange-500"
          : "bg-background border border-border"
      } transition-all duration-300`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Más popular
          </span>
        </div>
      )}

      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-4xl font-bold ${highlighted ? "text-orange-500" : "text-foreground"}`}>
          {price}
        </span>
        <span className="text-muted-foreground">{period}</span>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">{description}</p>

      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2.5 text-muted-foreground text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-orange-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        className={`w-full h-11 rounded-xl font-medium transition-colors duration-300 ${
          highlighted
            ? "bg-orange-500 hover:bg-orange-600 text-white"
            : "bg-muted hover:bg-muted/80 text-foreground"
        }`}
      >
        <Link to={ctaHref}>{cta}</Link>
      </Button>
    </motion.div>
  );
}
