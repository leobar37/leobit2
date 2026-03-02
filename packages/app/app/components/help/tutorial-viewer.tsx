import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Link } from "react-router";
import { ChevronLeft, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMobile } from "~/hooks/use-mobile";
import type { TutorialContent } from "~/lib/tutorials";

interface TutorialViewerProps {
  content: TutorialContent;
  isRead?: boolean;
  onMarkAsRead?: () => void;
}

// Mobile-friendly table component that renders rows as cards on small screens
function ResponsiveTable({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();

  // Extract table data from children
  const tableElement = children as React.ReactElement;
  const thead = tableElement?.props?.children?.[0];
  const tbody = tableElement?.props?.children?.[1];

  // Get headers
  const headers = thead?.props?.children?.props?.children?.map(
    (th: React.ReactElement) => th.props.children
  ) || [];

  // Get rows
  const rows = tbody?.props?.children?.map((tr: React.ReactElement) =>
    tr.props.children?.map((td: React.ReactElement) => td.props.children)
  ) || [];

  if (isMobile && headers.length > 0 && rows.length > 0) {
    return (
      <div className="space-y-3 mb-4">
        {rows.map((row: React.ReactNode[], rowIndex: number) => (
          <div
            key={rowIndex}
            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
          >
            {row.map((cell: React.ReactNode, cellIndex: number) => (
              <div key={cellIndex} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {headers[cellIndex]}
                </span>
                <span className="text-sm text-gray-700 text-right">{cell}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop table
  return (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-gray-200">
        {children}
      </table>
    </div>
  );
}

export function TutorialViewer({
  content,
  isRead,
  onMarkAsRead,
}: TutorialViewerProps) {
  const { title, content: markdownContent, category, tutorial } = content;

  const isMobile = useMobile();

  // Custom components for ReactMarkdown
  const components = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-6 md:mt-8 mb-3 md:mb-4 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 mt-5 md:mt-6 mb-2 md:mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-base md:text-lg font-medium text-gray-800 mt-4 md:mt-5 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-gray-700 leading-relaxed mb-3 md:mb-4 text-sm md:text-base">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside space-y-1.5 md:space-y-2 mb-3 md:mb-4 text-gray-700 text-sm md:text-base">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside space-y-1.5 md:space-y-2 mb-3 md:mb-4 text-gray-700 text-sm md:text-base">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="ml-2 md:ml-4">{children}</li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-gray-800">{children}</em>
    ),
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      const isInline = !className;
      return isInline ? (
        <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs md:text-sm font-mono">
          {children}
        </code>
      ) : (
        <pre className="bg-gray-900 text-gray-100 p-3 md:p-4 rounded-lg overflow-x-auto mb-3 md:mb-4 text-xs md:text-sm">
          <code className={className}>{children}</code>
        </pre>
      );
    },
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-orange-500 bg-orange-50 pl-3 md:pl-4 py-2 pr-3 md:pr-4 rounded-r-lg mb-3 md:mb-4 text-sm md:text-base">
        {children}
      </blockquote>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <ResponsiveTable>{children}</ResponsiveTable>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-gray-50">{children}</thead>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="border border-gray-200 px-3 md:px-4 py-2 text-left font-semibold text-gray-700 text-sm md:text-base">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="border border-gray-200 px-3 md:px-4 py-2 text-gray-700 text-sm md:text-base">
        {children}
      </td>
    ),
    img: ({ src, alt }: { src?: string; alt?: string }) => {
      // Handle relative image paths
      const imageSrc = src?.startsWith("./")
        ? `/tutorials/${category.id}/images/${src.replace("./images/", "")}`
        : src;
      return (
        <img
          src={imageSrc}
          alt={alt || ""}
          className="max-w-full h-auto rounded-lg shadow-md my-3 md:my-4"
        />
      );
    },
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      // Handle internal tutorial links
      if (href?.startsWith("../")) {
        const parts = href.replace("../", "").replace(".md", "").split("/");
        if (parts.length === 2) {
          const [targetCategory, targetSlug] = parts;
          return (
            <Link
              to={`/ayuda/${targetCategory}/${targetSlug}`}
              className="text-orange-600 hover:text-orange-700 underline"
            >
              {children}
            </Link>
          );
        }
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 hover:text-orange-700 underline"
        >
          {children}
        </a>
      );
    },
    hr: () => <hr className="my-4 md:my-6 border-gray-200" />,
  };

  // Process markdown to extract and style callouts
  const processedContent = markdownContent
    .replace(
      />&#x20;💡&#x20;\*\*Tip\*\*:\s*(.+)$/gm,
      `> <div class="flex items-start gap-2"><span class="text-lg">💡</span><div><strong class="text-green-700">Tip:</strong> $1</div></div>`
    )
    .replace(
      />&#x20;⚠️&#x20;\*\*Importante\*\*:\s*(.+)$/gm,
      `> <div class="flex items-start gap-2"><span class="text-lg">⚠️</span><div><strong class="text-amber-700">Importante:</strong> $1</div></div>`
    );

  return (
    <article className="max-w-3xl mx-auto px-4 md:px-0">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <Link
          to="/ayuda"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3 md:mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver a la ayuda
        </Link>

        <div className="flex items-center gap-2 mb-2 md:mb-3 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {category.title}
          </Badge>
          {isRead && (
            <Badge className="bg-green-100 text-green-700 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Leído
            </Badge>
          )}
        </div>

        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 md:mb-3">{title}</h1>

        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {tutorial.estimatedReadTime} min de lectura
          </span>
          <div className="flex gap-1.5 md:gap-2">
            {tutorial.tags.slice(0, isMobile ? 2 : undefined).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs capitalize">
                {tag}
              </Badge>
            ))}
            {isMobile && tutorial.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">+{tutorial.tags.length - 2}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-orange max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      </div>

      {/* Footer actions */}
      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:justify-between">
          <Link to="/ayuda" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Ver todos los tutoriales
            </Button>
          </Link>

          {onMarkAsRead && (
            <Button
              onClick={onMarkAsRead}
              variant={isRead ? "outline" : "default"}
              className={`w-full sm:w-auto ${isRead ? "" : "bg-orange-600 hover:bg-orange-700"}`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isRead ? "Marcar como no leído" : "Marcar como leído"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
