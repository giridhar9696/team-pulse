import { X } from "lucide-react";

type ConfirmBarProps = {
  title: string;
  actionLabel: string;
};

export function ConfirmBar({ title, actionLabel }: ConfirmBarProps) {
  return (
    <div className="confirm-bar" role="status">
      <span>{title}</span>
      <div className="confirm-bar__actions">
        <button className="button button--secondary" type="button">
          Cancel
        </button>
        <button className="button button--primary" type="button">
          {actionLabel}
        </button>
        <button className="icon-button" type="button" aria-label="Dismiss confirmation">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
