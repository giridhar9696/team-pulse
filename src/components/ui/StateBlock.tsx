import { AlertTriangle, CheckCircle2, CircleDashed, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

type StateBlockProps = {
  tone?: "loading" | "empty" | "error" | "success";
  title: string;
  children: ReactNode;
};

const icons = {
  loading: LoaderCircle,
  empty: CircleDashed,
  error: AlertTriangle,
  success: CheckCircle2,
};

export function StateBlock({ tone = "empty", title, children }: StateBlockProps) {
  const Icon = icons[tone];

  return (
    <section className={`state-block state-block--${tone}`}>
      <Icon size={22} className={tone === "loading" ? "spin" : undefined} />
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </section>
  );
}
