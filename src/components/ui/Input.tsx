import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Props = InputHTMLAttributes<HTMLInputElement> & {};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={clsx(
        "h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2",
        className
      )}
      style={{
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
        borderColor: "var(--border-color)",
      }}
      {...props}
    />
  );
});

export default Input;

