import { SelectHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={clsx(
        "h-9 w-full rounded-md border px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2",
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

export default Select;

