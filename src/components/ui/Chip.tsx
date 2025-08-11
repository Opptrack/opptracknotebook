import clsx from "clsx";

type Props = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
};

export function Chip({ label, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-3 h-8 rounded-full text-sm border",
        selected ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-white hover:bg-gray-50"
      )}
    >
      {label}
    </button>
  );
}

export default Chip;

