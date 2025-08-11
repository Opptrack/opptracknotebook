import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
};

export function Button({ className, variant = "default", size = "md", ...props }: Props) {
  const variants: Record<string, string> = {
    default: "text-white hover:opacity-90",
    outline: "border hover:bg-[var(--color-secondary)]",
    secondary: "bg-[var(--color-secondary)]",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-4 text-sm",
    lg: "h-10 px-5",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      style={variant === "default" ? { background: "var(--color-primary)" } : undefined}
      {...props}
    />
  );
}

export default Button;

