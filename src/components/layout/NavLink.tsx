"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

// ============ M3 导航项（navigation rail / navigation bar 共用） ============
// 活动指示器（胶囊）由外层容器的 CSS 控制：
//   · 桌面导航栏 → .app-rail-item / .app-rail-indicator
//   · 移动导航条 → .md-navbar-item / .md-navbar-indicator
// 导航进行中（useLinkStatus.pending）时：
//   · 在图标右上角显示小转圈（与用户点击位置就近反馈）
//   · 在页面顶部渲染 M3 linear progress indicator（Portal 到 body，
//     避免被导航容器的 backdrop-filter 裁剪/改变定位上下文）

export type NavVariant = "rail" | "bar";

interface NavLinkProps {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  variant: NavVariant;
}

export function NavLink({ href, label, icon, badge, variant }: NavLinkProps) {
  const pathname = usePathname();
  // 精确匹配或子路径匹配（如 /announcements/xxx 时「公告」仍高亮）
  const active = pathname === href || pathname?.startsWith(href + "/");

  const className =
    variant === "rail"
      ? `app-rail-item${active ? " active" : ""}`
      : `md-navbar-item${active ? " active" : ""}`;

  return (
    <Link
      href={href}
      className={className}
      aria-current={active ? "page" : undefined}
      // M3 fade through：切换主导航属于「同一层级换内容」，不做方向性位移
      transitionTypes={["nav-fade"]}
    >
      {variant === "rail" ? (
        <>
          <span className="app-rail-indicator">
            {icon}
            <PendingDot />
          </span>
          <span>{label}</span>
        </>
      ) : (
        <>
          <span className="md-navbar-indicator" style={{ position: "relative" }}>
            {icon}
            <PendingDot />
          </span>
          <span>{label}</span>
        </>
      )}
      {!!badge && badge > 0 && (
        <span
          className="win-badge-count"
          style={
            variant === "rail"
              ? { position: "absolute", top: 6, right: 14 }
              : { position: "absolute", top: 2, right: 18 }
          }
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <NavProgressBar />
    </Link>
  );
}

// 导航项内的小转圈（必须位于 <Link> 内部才能读到 pending 状态）
function PendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="md-nav-pending" aria-hidden />;
}

// 顶部 M3 线性进度条；Portal 到 body 以免受祖先 transform/filter 影响
function NavProgressBar() {
  const { pending } = useLinkStatus();
  if (!pending || typeof document === "undefined") return null;
  return createPortal(<div className="md-linear-progress" aria-hidden />, document.body);
}
