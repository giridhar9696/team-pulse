import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastProps = {
  tone?: "info" | "success" | "error";
  title: string;
  message: string;
  onDismiss?: () => void;
};

const icons = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
};

export function Toast({ tone = "info", title, message, onDismiss }: ToastProps) {
  const Icon = icons[tone];

  return (
    <div className={`toast toast--${tone}`} role="status">
      <Icon size={18} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onDismiss && (
        <button className="icon-button" type="button" aria-label="Dismiss message" onClick={onDismiss}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}
