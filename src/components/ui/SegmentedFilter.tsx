"use client";

// M3 segmented button：用于列表页的状态筛选（即将进行 / 已结束 / 全部 等）
// 受控组件，选项为 { value, label }，与 M3 的 "selected" 状态层保持一致

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedFilterProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedFilterProps<T>) {
  return (
    <div className="md-segmented" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            data-selected={selected}
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
