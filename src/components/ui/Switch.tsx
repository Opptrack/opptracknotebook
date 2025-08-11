import clsx from "clsx";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export function Switch({ checked, onChange, label }: Props) {
  return (
    <label className="inline-flex items-center gap-2 select-none cursor-pointer">
      {label && <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>}
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={clsx(
          "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border transition-colors",
        )}
        style={{ borderColor: "var(--border-color)", background: checked ? "var(--color-primary)" : "var(--color-secondary)" }}
      >
        <span
          className={clsx(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
            checked ? "translate-x-5" : "translate-x-0"
          )}
          style={{ margin: 2 }}
        />
      </span>
    </label>
  );
}

export default Switch;

