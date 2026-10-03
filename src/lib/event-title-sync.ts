import type { Prisma } from "@prisma/client";
import { buildEventTitle } from "@/lib/constants";

// ============ Event.title 冗余字段重算（服务端） ============
//
// Event.title 是「名称 - 性质 - 对手 - 时间」的组合展示字段，冗余存储。
// 它只在创建赛事与编辑赛事时生成，因此标签字典（赛事性质 / 赛事名称）
// 改名或删除后，历史赛事仍显示旧名称，且列表卡片与详情大标题直接使用该字段。
//
// 本函数在标签变更的同一事务内重算受影响赛事的标题，保证展示与字典一致。

function composeTitle(ev: {
  customName: string | null;
  opponent: string | null;
  eventTime: Date;
  nature: { name: string };
  name: { name: string } | null;
}): string {
  return buildEventTitle({
    displayName: ev.name?.name ?? ev.customName ?? "",
    natureName: ev.nature.name,
    opponent: ev.opponent ?? "",
    eventTime: ev.eventTime,
  });
}

/**
 * 按条件重算赛事标题。
 * @param where 受影响赛事的筛选条件（如 { natureId } / { nameId } / { id: { in: ids } }）
 * @returns 实际改写的赛事数量
 */
export async function regenerateEventTitles(
  tx: Prisma.TransactionClient,
  where: Prisma.EventWhereInput
): Promise<number> {
  const events = await tx.event.findMany({
    where,
    include: { nature: true, name: true },
  });

  let updated = 0;
  for (const ev of events) {
    const title = composeTitle(ev);
    if (title !== ev.title) {
      await tx.event.update({ where: { id: ev.id }, data: { title } });
      updated++;
    }
  }
  return updated;
}
