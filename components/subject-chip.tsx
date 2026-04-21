import { ReactNode } from "react";

export function SubjectChip({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm font-bold transition",
        active ? "bg-ink text-white" : "bg-mist text-moss hover:bg-white"
      ].join(" ")}
    >
      {children}
    </button>
  );
}
