"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatDateTime } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { SkeletonList, ErrorState, Empty } from "@/components/ui/StateView";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

interface Nature { id: string; name: string; }
interface Name { id: string; name: string; }
interface EventMap { id: string; name: string; }
interface SquadNature { id: string; name: string; }

interface Squad {
  id: string;
  index: number;
  capacity: number;
  nature: SquadNature;
  registeredCount: number;
}
interface EventListItem {
  id: string;
  title: string;
  eventTime: string;
  status: "UPCOMING" | "ARCHIVED";
  requiredCount: number;
  format: "BO3" | "BO5" | "R2" | null;
  nature: Nature;
  name: Name | null;
  customName: string | null;
  map: EventMap | null;
  isRead?: boolean;
  squads: Squad[];
  totalRegistered: number;
  totalSubstitutes: number;
  myRegistration: { squadId: string | null; isSubstitute: boolean } | null;
}

type StatusFilter = "UPCOMING" | "ARCHIVED" | "ALL";

const FILTERS = [
  { value: "UPCOMING" as const, label: "即将进行" },
  { value: "ARCHIVED" as const, label: "已结束" },
  { value: "ALL" as const, label: "全部" },
];

export default function EventsPage() {
  const [filter, setFilter] = useState<StatusFilter>("UPCOMING");

  // SWR：切换筛选保留上一份数据（keepPreviousData），切换不闪屏
  const {
    data: events,
    error,
    isLoading,
    mutate,
  } = useSWR<EventListItem[]>(`/api/events?status=${filter}`, fetcher, {
    keepPreviousData: true,
    // 进行中的赛事临近开始/结束状态会变化，30 秒轮询一次保证列表新鲜
    refreshInterval: filter === "ARCHIVED" ? 0 : 30000,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 880, margin: "0 auto" }}>
      <PageHeader
        title="赛事"
        description="查看即将进行的赛事并报名"
        actions={<SegmentedFilter options={FILTERS} value={filter} onChange={setFilter} ariaLabel="赛事筛选" />}
      />

      {isLoading && !events ? (
        <SkeletonList count={4} />
      ) : error && !events ? (
        <ErrorState message={error.message || "加载失败"} onRetry={() => mutate()} />
      ) : !events || events.length === 0 ? (
        <Empty text={filter === "ARCHIVED" ? "暂无已结束赛事" : "暂无赛事"} />
      ) : (
        <div className="md-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventListItem }) {
  const natureColors: Record<string, string> = {
    正赛: "var(--win-danger)",
    训练赛: "var(--win-accent)",
    娱乐赛: "var(--win-success)",
    其他: "var(--win-text-tertiary)",
  };

  return (
    <Link
      href={`/events/${event.id}`}
      className="win-card win-reveal"
      transitionTypes={["nav-forward"]}
      style={{
        padding: 20,
        display: "block",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        opacity: event.status === "ARCHIVED" ? 0.7 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {/* 未读红点：仅即将进行的未读赛事展示，点击进入详情即确认收到 */}
            {event.status === "UPCOMING" && !event.isRead && (
              <span style={{ width: 8, height: 8, background: "var(--win-danger)", borderRadius: "50%", flexShrink: 0 }} />
            )}
            <span
              className="win-chip"
              style={{
                background: "transparent",
                borderColor: natureColors[event.nature.name] || "var(--win-border-strong)",
                color: natureColors[event.nature.name] || "var(--win-text-secondary)",
                fontSize: 11,
              }}
            >
              {event.nature.name}
            </span>
            {(event.name || event.customName) && (
              <span className="win-chip" style={{ fontSize: 11 }}>{event.name?.name ?? event.customName}</span>
            )}
            {event.map && (
              <span className="win-chip" style={{ fontSize: 11 }}>{event.map.name}</span>
            )}
            {event.format && (
              <span className="win-chip" style={{ fontSize: 11, background: "var(--win-bg-selected)", color: "var(--win-accent)", borderColor: "var(--win-accent)" }}>
                {event.format}
              </span>
            )}
            {event.status === "ARCHIVED" && (
              <span className="win-chip" style={{ fontSize: 11, background: "var(--win-bg-pressed)", color: "var(--win-text-tertiary)" }}>
                已结束
              </span>
            )}
            {event.myRegistration && (
              <span className="win-chip" style={{ fontSize: 11, background: "var(--win-bg-selected)", color: "var(--win-accent)", borderColor: "var(--win-accent)" }}>
                {event.myRegistration.isSubstitute ? "替补中" : "已报名"}
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{event.title}</h3>
          <div style={{ fontSize: 13, color: "var(--win-text-secondary)" }}>
            {formatDateTime(event.eventTime)}
          </div>
        </div>
        <MaterialIcon name="keyboard_arrow_right" size={20} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "var(--win-text-tertiary)" }}>报名</span>
          <span style={{ fontWeight: 600, color: event.totalRegistered >= event.requiredCount ? "var(--win-success)" : "var(--win-text)" }}>
            {event.totalRegistered}
          </span>
          <span style={{ color: "var(--win-text-tertiary)" }}>/{event.requiredCount}</span>
        </div>
        {event.totalSubstitutes > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--win-text-tertiary)" }}>替补</span>
            <span style={{ fontWeight: 600 }}>{event.totalSubstitutes}</span>
          </div>
        )}
        <div style={{ color: "var(--win-text-secondary)" }}>
          分队：
          {event.squads.map((s, i) => (
            <span key={s.id}>
              {i > 0 && <span style={{ color: "var(--win-text-tertiary)" }}>、</span>}
              <span style={{ color: s.registeredCount >= s.capacity ? "var(--win-success)" : "var(--win-text)" }}>
                {s.registeredCount}/{s.capacity}
              </span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
