"use client";

import { useEffect } from "react";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

export default function GlobalError({
  error,
  reset,
  // Next 16 推荐用 unstable_retry()：它会重新拉取并重渲染该段，
  // 能恢复 Server Component 抛错导致的失败；reset() 只清空错误状态、
  // 不重新取数，无法从服务端错误中恢复（故仅作为兜底保留）
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  const retry = unstable_retry ?? reset ?? (() => window.location.reload());

  return (
    <div
      className="md-page-enter"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        background: "var(--md-sys-color-surface)",
        color: "var(--md-sys-color-on-surface)",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          display: "grid",
          placeItems: "center",
          borderRadius: "var(--md-sys-shape-corner-full)",
          background: "var(--md-sys-color-error-container)",
          color: "var(--md-sys-color-on-error-container)",
        }}
        aria-hidden
      >
        <MaterialIcon name="warning" size={32} />
      </div>
      <p className="md-typescale-body-large" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
        页面出错了，请重试
      </p>
      <button className="win-btn win-btn-primary" onClick={retry}>
        重新加载
      </button>
    </div>
  );
}
