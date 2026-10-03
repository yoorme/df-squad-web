"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { NavLink } from "./NavLink";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

interface AppShellProps {
  children: ReactNode;
  // 导航项由 (app)/layout.tsx 统一构造（含未读角标），此处不再提供默认值
  navItems: NavItem[];
  showAdmin?: boolean;
  // 图标版本号（iconUpdatedAt 时间戳）：拼在 /favicon.ico?v= 后，
  // 管理员更换图标后刷新页面即可看到新图标（绕过浏览器缓存）
  iconVersion?: number;
  // 战队展示名（前缀去掉分隔符，如 "XX丨" → "XX"）：拼入侧边栏品牌名，
  // 修改前缀后随 (app)/layout 重新渲染自动更新
  teamDisplayName?: string;
}

// 移动端顶栏标题：按一级路由取栏目名（详情页沿用所属栏目）
const SECTION_TITLES: Record<string, string> = {
  announcements: "公告",
  events: "赛事",
  members: "队员",
  me: "我的",
  admin: "管理",
};

export function AppShell({ children, navItems, showAdmin, iconVersion, teamDisplayName }: AppShellProps) {
  const pathname = usePathname();

  const adminItem: NavItem = {
    href: "/admin",
    label: "管理",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  };

  const items = showAdmin ? [...navItems, adminItem] : navItems;
  const sectionKey = pathname?.split("/")[1] ?? "";
  const title = SECTION_TITLES[sectionKey] ?? "战队报名";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "row" }}>
      {/* 桌面/横屏：M3 navigation rail（导航栏），活动项带胶囊指示器 */}
      <aside className="acrylic-strong app-rail" aria-label="主导航">
        <Link href="/announcements" className="app-rail-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/favicon.ico?v=${iconVersion ?? 0}`}
            alt="战队图标"
            width={36}
            height={36}
            style={{ borderRadius: 10, imageRendering: "pixelated", flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--md-sys-color-on-surface-variant)",
              maxWidth: 76,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {teamDisplayName || "战队"}
          </span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", alignItems: "center" }}>
          {items.map((item) => (
            <NavLink key={item.href} {...item} variant="rail" />
          ))}
        </nav>
      </aside>

      <div className="app-column">
        {/* 移动端：M3 small top app bar（大标题由页面自身渲染） */}
        <header className="acrylic-strong app-bar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/favicon.ico?v=${iconVersion ?? 0}`}
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: 8, imageRendering: "pixelated", flexShrink: 0 }}
          />
          <span
            className="md-typescale-title-large"
            style={{ fontWeight: 600, fontSize: 20, color: "var(--md-sys-color-on-surface)" }}
          >
            {title}
          </span>
          <span style={{ flex: 1 }} />
          {showAdmin && (
            <Link
              href="/admin"
              className="md-icon-btn"
              aria-label="管理后台"
              transitionTypes={["nav-fade"]}
            >
              {adminItem.icon}
            </Link>
          )}
        </header>

        {/* 主内容区：包一层 ViewTransition，实现 M3 页面转场
            · nav-fade   —— 主导航切换：fade through（无位移，同级换内容）
            · nav-forward —— 进入详情：shared axis X 前进入场
            · nav-back    —— 返回列表：shared axis X 后退入场
            · default: none —— 首次加载/无关更新不播动画 */}
        <main className="app-main" id="main-content">
          <ViewTransition
            default="none"
            enter={{
              "nav-fade": "md-fade-through",
              "nav-forward": "md-nav-forward",
              "nav-back": "md-nav-back",
              default: "none",
            }}
            exit={{
              "nav-fade": "md-fade-through",
              "nav-forward": "md-nav-forward",
              "nav-back": "md-nav-back",
              default: "none",
            }}
          >
            {children}
          </ViewTransition>
        </main>
      </div>

      {/* 移动端：M3 navigation bar（底部导航条） */}
      <nav className="acrylic-strong app-navbar" aria-label="主导航">
        {items.map((item) => (
          <NavLink key={item.href} {...item} variant="bar" />
        ))}
      </nav>

      {/* 队员入口：仅在公告页面显示；M3 extended FAB（桌面浮于导航栏右侧，移动端浮于内容上方） */}
      {sectionKey === "announcements" && (
        <Link href="/members" className="md-fab md-fab-extended md-fab-surface app-fab" transitionTypes={["nav-fade"]}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>队员</span>
        </Link>
      )}
    </div>
  );
}
