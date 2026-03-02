import { Link } from "react-router";
import { Clock, CheckCircle, BookOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tutorial, TutorialCategory } from "~/lib/tutorials";

interface TutorialCardProps {
  tutorial: Tutorial;
  category: TutorialCategory;
  isRead?: boolean;
  compact?: boolean;
}

export function TutorialCard({
  tutorial,
  category,
  isRead,
  compact,
}: TutorialCardProps) {
  const categorySlug = category.id;

  if (compact) {
    return (
      <Link to={`/ayuda/${categorySlug}/${tutorial.slug}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                    {tutorial.title}
                  </h4>
                  {isRead && (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-500 line-clamp-1">
                  {tutorial.description}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/ayuda/${categorySlug}/${tutorial.slug}`}>
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-orange-100">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
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
              <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                {tutorial.title}
              </h3>
            </div>
            <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {tutorial.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tutorial.estimatedReadTime} min
            </span>
            <div className="flex gap-1">
              {tutorial.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs capitalize">
                  {tag}
                </Badge>
              ))}
              {tutorial.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{tutorial.tags.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
