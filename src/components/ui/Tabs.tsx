import type { ReactNode } from "react";

type TabItem<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type TabsProps<T extends string> = {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  label: string;
};

export function Tabs<T extends string>({ value, items, onChange, label }: TabsProps<T>) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          className={item.value === value ? "tabs__button tabs__button--active" : "tabs__button"}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
