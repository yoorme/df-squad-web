"use client";

import type { ReactNode } from "react";

// 页面标题区（M3 headline-small + body-small 说明 + 右侧操作/筛选）
// 统一各列表页/详情页的标题排版，避免每页重复 inline 样式

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          className="md-typescale-headline-small"
          style={{ fontWeight: 600, color: "var(--md-sys-color-on-surface)" }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="md-typescale-body-small"
            style={{ color: "var(--md-sys-color-on-surface-variant)", marginTop: 4 }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
