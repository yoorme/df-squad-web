import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { ThemeFromIcon } from "@/components/theme/ThemeFromIcon";
import { getSiteSettings } from "@/lib/site-settings";
import { prefixDisplayName } from "@/lib/constants";
import "./globals.css";

// 全站动态渲染：站点标题依赖数据库中的战队前缀，
// 且避免构建期（GitHub Actions 无数据库连接）预渲染访问数据库
export const dynamic = "force-dynamic";

// 浏览器地址栏/状态栏配色跟随背景色（与 App 的 background 角色一致）
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#121214" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const { teamPrefix, iconUpdatedAt } = await getSiteSettings();
  const displayName = prefixDisplayName(teamPrefix);
  return {
    title: `${displayName}战队报名系统`,
    description: "三角洲行动战队内部赛事报名系统",
    // 标签页图标带版本号（iconUpdatedAt）：更换图标后 URL 变化，
    // 浏览器强制重新拉取，修复「刷新网页图标不生效」的缓存问题
    icons: { icon: `/favicon.ico?v=${iconUpdatedAt?.getTime() ?? 0}` },
  };
}

// 首屏前置脚本：把上次算好的图标取色主题在首次绘制前套用，
// 避免「先显示静态配色、取色完成后再跳变」的闪烁。
// 仅读取 localStorage 中已生成好的变量（纯本机数据，无注入面）。
function themeBootstrapScript(iconVersion: number): string {
  return `(function(){try{var raw=localStorage.getItem("squad-theme-vars");if(!raw)return;var t=JSON.parse(raw);if(!t||t.v!==${iconVersion})return;var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var vars=t.vars[dark?"dark":"light"];if(!vars)return;var root=document.documentElement;for(var k in vars){root.style.setProperty(k,vars[k]);}}catch(e){}})();`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { iconUpdatedAt } = await getSiteSettings();
  const iconVersion = iconUpdatedAt?.getTime() ?? 0;
  // 开关（运行时读环境变量，无需重新构建）：THEME_FROM_ICON=off 可关闭取色，
  // 回退到 globals.css 中的静态配色
  const themeFromIcon = process.env.THEME_FROM_ICON !== "off";

  return (
    <html lang="zh-CN">
      <head>
        {themeFromIcon && (
          <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript(iconVersion) }} />
        )}
      </head>
      <body>
        {themeFromIcon && <ThemeFromIcon iconVersion={iconVersion} />}
        <SessionProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
