import { motion } from "framer-motion";
import { Quote } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
}

export function TestimonialCard({ quote, author, role, avatar }: TestimonialCardProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-orange-500/30 transition-colors"
    >
      <Quote className="w-8 h-8 text-orange-500/50 mb-4" />
      <p className="text-slate-300 mb-6 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt={author} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
            {author.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-white font-medium">{author}</p>
          <p className="text-slate-400 text-sm">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}
