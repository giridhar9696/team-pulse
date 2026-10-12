import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="form-row">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        {hint && <span>{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  trailing?: ReactNode;
  error?: string;
};

export function TextInput({ icon, trailing, error, ...props }: TextInputProps) {
  return (
    <div className={error ? "input-shell input-shell--error" : "input-shell"}>
      {icon}
      <input aria-invalid={Boolean(error)} aria-describedby={error ? `${props.id}-error` : undefined} {...props} />
      {trailing}
    </div>
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="input-shell">
      <select {...props} />
    </div>
  );
}

export function TextAreaInput(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="input-shell input-shell--textarea">
      <textarea {...props} />
    </div>
  );
}
