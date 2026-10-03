"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, ViewTransition, type ReactNode } from "react";
import { NavLink } from "./NavLink";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

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
    icon: <MaterialIcon name="settings" size={24} />,
  };

  const items = showAdmin ? [...navItems, adminItem] : navItems;
  const sectionKey = pathname?.split("/")[1] ?? "";
  const title = SECTION_TITLES[sectionKey] ?? "战队报名";

  // 底部导航条的滑动指示器：定位到当前栏目对应的项（等宽均分，无需测量）
  const isItemActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");
  const activeIndex = Math.max(0, items.findIndex((it) => isItemActive(it.href)));

  // 顶栏滚动状态（M3：内容滚动后顶栏提升高度层级，与内容分层）
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        {/* 移动端：M3 small top app bar（大标题由页面自身渲染）。
            不在此放入口按钮：管理入口已在底部导航条里（与桌面导航栏共用同一份 items） */}
        <header className={`acrylic-strong app-bar${scrolled ? " is-scrolled" : ""}`}>
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
        </header>

        {/* 主内容区：包一层 ViewTransition，实现 M3 页面转场
            · nav-fade   —— 主导航切换：fade through（无位移，同级换内容）
            · nav-forward —— 进入详情：shared axis X 前进入场
            · nav-back    —— 返回列表：shared axis X 后退入场
            · default: fade through —— 浏览器返回/手势返回不带转场类型，
              回落为交叉淡化（移动端返回手势的主要路径），避免生硬跳变 */}
        <main className="app-main" id="main-content">
          <ViewTransition
            default="none"
            enter={{
              "nav-fade": "md-fade-through",
              "nav-forward": "md-nav-forward",
              "nav-back": "md-nav-back",
              default: "md-fade-through",
            }}
            exit={{
              "nav-fade": "md-fade-through",
              "nav-forward": "md-nav-forward",
              "nav-back": "md-nav-back",
              default: "md-fade-through",
            }}
          >
            {children}
          </ViewTransition>
        </main>
      </div>

      {/* 移动端：M3 navigation bar（底部导航条）。
          活动指示器是一个整体滑动的胶囊（而非各项独立出现），
          切换栏目时按 M3 emphasized 缓动滑到目标项 */}
      <nav className="acrylic-strong app-navbar" aria-label="主导航">
        <span
          className="app-navbar-pill"
          aria-hidden
          style={{
            left: `${((activeIndex + 0.5) * 100) / items.length}%`,
            width: `min(64px, ${100 / items.length}%)`,
          }}
        />
        {items.map((item) => (
          <NavLink key={item.href} {...item} variant="bar" />
        ))}
      </nav>

      {/* 队员入口：仅在公告页面显示；M3 extended FAB（桌面浮于导航栏右侧，移动端浮于内容上方） */}
      {sectionKey === "announcements" && (
        <Link href="/members" className="md-fab md-fab-extended md-fab-surface app-fab" transitionTypes={["nav-fade"]}>
          <MaterialIcon name="groups" size={24} />
          <span>队员</span>
        </Link>
      )}
    </div>
  );
}
