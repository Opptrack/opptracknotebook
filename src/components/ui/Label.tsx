import { LabelHTMLAttributes } from "react";
import clsx from "clsx";

type Props = LabelHTMLAttributes<HTMLLabelElement> & {};

export function Label({ className, ...props }: Props) {
  return <label className={clsx("text-sm font-medium text-gray-700", className)} {...props} />;
}

export default Label;

