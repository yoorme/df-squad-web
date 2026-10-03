import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { getSiteSettings } from "@/lib/site-settings";
import { prefixDisplayName } from "@/lib/constants";
import "./globals.css";

// 全站动态渲染：站点标题依赖数据库中的战队前缀，
// 且避免构建期（GitHub Actions 无数据库连接）预渲染访问数据库
export const dynamic = "force-dynamic";

// 浏览器地址栏/状态栏配色跟随 M3 表面色（移动端沉浸式观感）
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#111318" },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SessionProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
