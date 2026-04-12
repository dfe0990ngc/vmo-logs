import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex flex-col justify-center items-center bg-background p-10 border border-dashed rounded-lg text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="flex justify-center items-center bg-muted mb-4 rounded-full w-14 h-14 text-muted-foreground">
          {icon}
        </div>
      )}

      <h3 className="font-medium text-lg">{title}</h3>

      {description && (
        <p className="mt-1 max-w-md text-muted-foreground text-sm">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
