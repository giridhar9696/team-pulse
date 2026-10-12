import { Activity } from "lucide-react";

type BrandMarkProps = {
  stacked?: boolean;
};

export function BrandMark({ stacked = false }: BrandMarkProps) {
  return (
    <span className={stacked ? "brand brand--stacked" : "brand"}>
      <span className="brand__icon" aria-hidden="true">
        <Activity size={20} />
      </span>
      <span>
        <strong>Team Pulse</strong>
        {stacked && <small>Every Task. One Team. On Track.</small>}
      </span>
    </span>
  );
}
