import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { prefixDisplayName } from "@/lib/constants";
import { Role } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const isAdmin = user.role === Role.ADMIN;

  // 并行查询红点未读数（反连接一次查出，替代原先 total-read 的多查询差值计算）
  // - 公告：已归档的不计入未读红点
  // - 赛事：仅未读的进行中赛事（已归档/已过期不计入），点击进入详情即确认收到
  const [unreadAnnouncements, unreadEvents, settings] = await Promise.all([
    prisma.announcement.count({
      where: { isArchived: false, reads: { none: { userId: user.id } } },
    }),
    prisma.event.count({
      where: {
        status: "UPCOMING",
        eventTime: { gte: new Date() },
        reads: { none: { userId: user.id } },
      },
    }),
    getSiteSettings(),
  ]);

  // 图标与安卓 App 一致（Material Icons filled）：
  // 公告 = Campaign，赛事 = EmojiEvents，我的 = Person
  const navItems = [
    {
      href: "/announcements",
      label: "公告",
      badge: unreadAnnouncements,
      icon: <MaterialIcon name="campaign" size={24} />,
    },
    {
      href: "/events",
      label: "赛事",
      badge: unreadEvents,
      icon: <MaterialIcon name="emoji_events" size={24} />,
    },
    {
      href: "/me",
      label: "我的",
      icon: <MaterialIcon name="person" size={24} />,
    },
  ];

  return (
    <AppShell
      navItems={navItems}
      showAdmin={isAdmin}
      iconVersion={settings.iconUpdatedAt?.getTime() ?? 0}
      teamDisplayName={prefixDisplayName(settings.teamPrefix)}
    >
      {children}
    </AppShell>
  );
}
