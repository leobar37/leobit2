import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative bg-background rounded-2xl p-6 hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className="relative">
        <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
          <Icon className="w-5 h-5 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
