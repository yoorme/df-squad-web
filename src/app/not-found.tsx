import Link from "next/link";

export default function NotFound() {
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
        className="md-typescale-display-small"
        style={{
          fontWeight: 700,
          color: "var(--md-sys-color-primary-container)",
          WebkitTextStroke: "1px var(--md-sys-color-primary)",
        }}
      >
        404
      </div>
      <p className="md-typescale-body-large" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
        页面不存在或已被移除
      </p>
      <Link href="/announcements" className="win-btn win-btn-primary">
        返回首页
      </Link>
    </div>
  );
}
