import { PropsWithChildren } from "react";
import clsx from "clsx";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={clsx(
        "rounded-lg border shadow-sm",
        className
      )}
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-color)",
        borderRadius: "var(--border-radius)",
        color: "var(--text-primary)",
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("px-4 py-3 border-b", className)} style={{ borderColor: "var(--border-color)" }}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx("px-4 py-3", className)}>{children}</div>;
}

export function CardFooter({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("px-4 py-3 border-t", className)} style={{ borderColor: "var(--border-color)" }}>
      {children}
    </div>
  );
}

export default Card;

