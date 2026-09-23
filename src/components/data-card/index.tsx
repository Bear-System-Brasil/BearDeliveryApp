import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DataCardProps {
  title: string;
  icon?: ReactNode;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Reusable data display card component
 */
export function DataCard({
  title,
  icon,
  badge,
  actions,
  className,
  children,
}: DataCardProps) {
  return (
    <Card className={cn("border-0 shadow-lg", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {icon && <span className="text-brand-500">{icon}</span>}
            <span>{title}</span>
          </CardTitle>

          <div className="flex items-center space-x-2">
            {badge && (
              <Badge variant={badge.variant || "default"}>{badge.text}</Badge>
            )}
            {actions}
          </div>
        </div>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}
