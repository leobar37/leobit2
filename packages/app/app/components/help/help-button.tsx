import { CircleHelp, Menu } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

interface HelpButtonProps {
  onMenuClick?: () => void;
}

export function HelpButton({ onMenuClick }: HelpButtonProps) {
  if (onMenuClick) {
    return (
      <Button
        type="button"
        size="icon"
        onClick={onMenuClick}
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-orange-600 shadow-lg hover:bg-orange-700 md:hidden"
        aria-label="Abrir menú de ayuda"
      >
        <Menu className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Link to="/ayuda" className="fixed bottom-20 right-4 z-40">
      <Button
        type="button"
        size="icon"
        className="h-12 w-12 rounded-full bg-orange-600 shadow-lg hover:bg-orange-700"
        aria-label="Ir al centro de ayuda"
      >
        <CircleHelp className="h-5 w-5" />
      </Button>
    </Link>
  );
}
