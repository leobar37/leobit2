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
      className="bg-background rounded-2xl p-6"
    >
      <Quote className="w-7 h-7 text-muted-foreground/20 mb-4" />
      <p className="text-muted-foreground mb-6 leading-relaxed text-sm">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt={author} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {author.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-foreground font-medium text-sm">{author}</p>
          <p className="text-muted-foreground text-xs">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}
