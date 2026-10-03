"use client";

import type { CSSProperties, ReactNode } from "react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

// 统一的状态展示组件：加载中 / 加载失败（可重试） / 空数据 / 骨架屏
// 替代各页面重复内联的 "加载中..." 与缺失的错误分支

const baseStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: "48px 24px",
  color: "var(--md-sys-color-on-surface-variant)",
  fontSize: 14,
  textAlign: "center",
};

/** M3 circular progress indicator + 文案 */
export function Loading({ text = "加载中..." }: { text?: string }) {
  return (
    <div style={baseStyle} role="status" aria-live="polite">
      <span className="win-spinner" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

export function ErrorState({
  message = "加载失败",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div style={baseStyle} role="alert">
      <MaterialIcon name="error" size={32} style={{ color: "var(--md-sys-color-error)" }} />
      <span>{message}</span>
      {onRetry && (
        <button className="win-btn win-btn-secondary" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}

export function Empty({
  icon,
  text,
  children,
}: {
  icon?: ReactNode;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div style={baseStyle}>
      {icon && (
        <span style={{ fontSize: 28, opacity: 0.6 }} aria-hidden>
          {icon}
        </span>
      )}
      <span>{text}</span>
      {children}
    </div>
  );
}

// ============ 骨架屏（M3 loading placeholder） ============
// 列表加载时优先使用骨架屏而非居中转圈：内容轮廓先行，
// 数据到达后原地替换，视觉跳动更小（M3 建议的 progressive loading）

function SkeletonLine({
  width = "100%",
  height = 14,
  style,
}: {
  width?: number | string;
  height?: number;
  style?: CSSProperties;
}) {
  return <div className="md-skeleton" style={{ width, height, ...style }} />;
}

/** 列表卡片骨架（公告/赛事/成员列表通用） */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
      role="status"
      aria-live="polite"
      aria-label="加载中"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="win-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SkeletonLine width={64} height={22} style={{ borderRadius: 999 }} />
            <SkeletonLine width={96} height={22} style={{ borderRadius: 999 }} />
          </div>
          <SkeletonLine width={`${70 - i * 6}%`} height={18} />
          <SkeletonLine width="40%" height={12} />
        </div>
      ))}
    </div>
  );
}

/** 详情页骨架：头部卡片 + 内容块 */
export function SkeletonDetail() {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
      role="status"
      aria-live="polite"
      aria-label="加载中"
    >
      <SkeletonLine width={120} height={14} />
      <div className="win-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <SkeletonLine width={56} height={22} style={{ borderRadius: 999 }} />
          <SkeletonLine width={72} height={22} style={{ borderRadius: 999 }} />
          <SkeletonLine width={64} height={22} style={{ borderRadius: 999 }} />
        </div>
        <SkeletonLine width="60%" height={22} />
        <SkeletonLine width="32%" height={14} />
      </div>
      <div className="win-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <SkeletonLine width="30%" height={18} />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} width={`${92 - i * 8}%`} height={14} />
        ))}
      </div>
    </div>
  );
}
