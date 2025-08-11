import { TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        "w-full min-h-[80px] rounded-md border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2",
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

export default Textarea;

