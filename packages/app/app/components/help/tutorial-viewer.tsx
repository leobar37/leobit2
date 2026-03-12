import { CheckCircle2, Circle, Clock, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "~/lib/utils";
import type { TutorialContent } from "~/lib/tutorials";

interface TutorialViewerProps {
  content: TutorialContent;
  isRead: boolean;
  onMarkAsRead: () => void;
}

export function TutorialViewer({
  content,
  isRead,
  onMarkAsRead,
}: TutorialViewerProps) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{content.category.title}</Badge>
          <Badge
            variant="outline"
            className={cn(
              isRead && "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {isRead ? (
              <>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Leido
              </>
            ) : (
              <>
                <Circle className="mr-1 h-3.5 w-3.5" />
                Pendiente
              </>
            )}
          </Badge>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {content.title}
        </h1>
        <p className="mt-3 text-base text-gray-600">
          {content.tutorial.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {content.tutorial.estimatedReadTime} min de lectura
          </span>
          <span className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            {content.tutorial.tags.join(", ")}
          </span>
        </div>

        <div className="mt-6">
          <Button
            type="button"
            variant={isRead ? "outline" : "default"}
            onClick={onMarkAsRead}
            className={cn(!isRead && "bg-orange-600 hover:bg-orange-700")}
          >
            {isRead ? "Marcar como no leido" : "Marcar como leido"}
          </Button>
        </div>
      </header>

      <div className="prose prose-gray max-w-none prose-headings:scroll-mt-24 prose-a:text-orange-600 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-pre:rounded-2xl prose-pre:border prose-pre:border-gray-200">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {content.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
