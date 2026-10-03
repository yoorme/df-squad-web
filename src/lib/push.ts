import { prisma } from "@/lib/prisma";

// ============ 极光推送（JPush）服务端客户端 ============
// 未配置 JPUSH_APPKEY / JPUSH_MASTER_SECRET 时静默降级：所有发送函数直接返回，
// 业务流程不受影响（本地开发/未注册推送的环境照常运行）。
// 文档：https://docs.jiguang.cn/jpush/server/push/rest_api_v3_push

const JPUSH_API = "https://api.jpush.cn/v3/push";
// 单次 registration_id 数量上限（官方建议 ≤1000，留余量）
const CHUNK_SIZE = 900;

const APP_KEY = process.env.JPUSH_APPKEY || "";
const MASTER_SECRET = process.env.JPUSH_MASTER_SECRET || "";

export function jpushConfigured(): boolean {
  return Boolean(APP_KEY && MASTER_SECRET);
}

export interface PushExtras {
  type: "NEW_EVENT" | "EVENT_REMINDER" | "NEW_ANNOUNCEMENT";
  eventId?: string;
  announcementId?: string;
}

interface PushPayload {
  title: string; // 通知标题（如战队名）
  content: string; // 通知正文
  extras: PushExtras;
}

async function sendToRegistrationIds(
  registrationIds: string[],
  payload: PushPayload
): Promise<boolean> {
  if (!jpushConfigured() || registrationIds.length === 0) return false;

  const body = {
    platform: "all",
    audience: { registration_id: registrationIds },
    notification: {
      android: {
        alert: payload.content,
        title: payload.title,
        // extras 会随点击意图透传给 App，用于深链跳转
        extras: payload.extras as unknown as Record<string, string>,
      },
    },
    options: {
      // 离线保留 1 天：设备长时间离线后上线仍可收到
      time_to_live: 86400,
      // Android 厂商通道（华为/小米/OPPO/vivo/荣耀）需在极光后台配置；
      // 未配置的设备走极光自有长连接通道
    },
  };

  const auth = Buffer.from(`${APP_KEY}:${MASTER_SECRET}`).toString("base64");
  try {
    const res = await fetch(JPUSH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[JPush] 发送失败", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[JPush] 请求异常", e);
    return false;
  }
}

// 给指定用户集合推送（自动查找其已启用的设备并分批发送）
// 返回「成功下发到至少一台设备的用户」集合：
// 调用方据此记账（写 PushLog），避免给没有设备/发送失败的用户也记为已推送，
// 否则这些用户之后绑定设备将永远收不到该条通知
async function pushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<Set<string>> {
  const sentUsers = new Set<string>();
  if (userIds.length === 0) return sentUsers;
  const devices = await prisma.device.findMany({
    where: { userId: { in: userIds }, enabled: true },
    select: { userId: true, registrationId: true },
  });
  if (devices.length === 0) return sentUsers;

  for (let i = 0; i < devices.length; i += CHUNK_SIZE) {
    const chunk = devices.slice(i, i + CHUNK_SIZE);
    const okChunk = await sendToRegistrationIds(chunk.map((d) => d.registrationId), payload);
    if (okChunk) {
      for (const d of chunk) sentUsers.add(d.userId);
    }
  }
  return sentUsers;
}

// ============ 业务推送（调用方 fire-and-forget：void pushXxx().catch(...)）============

// 新赛事发布：推送给开启「新比赛通知」的用户（未设置过的用户默认开启）
export async function pushNewEvent(eventId: string, title: string, timeText: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: { disabled: false },
    select: {
      id: true,
      notificationSetting: { select: { notifyNewEvent: true } },
    },
  });
  const userIds = users
    .filter((u) => u.notificationSetting?.notifyNewEvent ?? true)
    .map((u) => u.id);
  const sentUsers = await pushToUsers(userIds, {
    title: "新比赛发布",
    content: title + (timeText ? `（${timeText}）` : ""),
    extras: { type: "NEW_EVENT", eventId },
  });
  // 去重日志：同一用户同一赛事只推一次（调试与审计用），仅记录实际送达的用户
  if (sentUsers.size > 0) {
    await prisma.pushLog
      .createMany({
        data: [...sentUsers].map((userId) => ({
          userId,
          dedupKey: `new_event:${eventId}`,
        })),
        skipDuplicates: true,
      })
      .catch(() => {});
  }
}

// 新公告发布：推送给开启「公告通知」的用户（未设置过的用户默认开启）
export async function pushNewAnnouncement(
  announcementId: string,
  title: string
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { disabled: false },
    select: {
      id: true,
      notificationSetting: { select: { notifyAnnouncement: true } },
    },
  });
  const userIds = users
    .filter((u) => u.notificationSetting?.notifyAnnouncement ?? true)
    .map((u) => u.id);
  const sentUsers = await pushToUsers(userIds, {
    title: "新公告",
    content: title,
    extras: { type: "NEW_ANNOUNCEMENT", announcementId },
  });
  if (sentUsers.size > 0) {
    await prisma.pushLog
      .createMany({
        data: [...sentUsers].map((userId) => ({
          userId,
          dedupKey: `new_announcement:${announcementId}`,
        })),
        skipDuplicates: true,
      })
      .catch(() => {});
  }
}

// 比赛临近提醒：给指定报名用户按其设置的提前量推送
// 返回「实际送达的用户」集合（用于提醒日志的去重记账，只记真正推送成功的人）
export async function pushEventReminder(
  eventId: string,
  title: string,
  minutesLeft: number,
  userIds: string[]
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const minutesText = minutesLeft >= 60 ? `${Math.round(minutesLeft / 60)} 小时` : `${minutesLeft} 分钟`;
  return pushToUsers(userIds, {
    title: "比赛即将开始",
    content: `${title} 将于 ${minutesText} 后开始`,
    extras: { type: "EVENT_REMINDER", eventId },
  });
}
