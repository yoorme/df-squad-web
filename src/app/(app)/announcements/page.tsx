"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { formatDateTime } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { SkeletonList, ErrorState, Empty } from "@/components/ui/StateView";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

interface AnnouncementListItem {
  id: string;
  title: string;
  author: { username: string; nickname: string };
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  isRead: boolean;
  commentCount: number;
}

type StatusFilter = "normal" | "archived" | "all";

const FILTERS = [
  { value: "normal" as const, label: "正常" },
  { value: "archived" as const, label: "已归档" },
  { value: "all" as const, label: "全部" },
];

// 公告列表：默认展示正常公告；管理员可切换 正常/已归档/全部
// 已归档公告仅管理员可见（普通队员任何 tab 都不会返回）
export default function AnnouncementsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [filter, setFilter] = useState<StatusFilter>("normal");

  // SWR：切换筛选时保留上一份数据（keepPreviousData），避免闪屏；
  // 自动请求去重，快速切换 tab 不会被慢响应覆盖
  const {
    data: items,
    error,
    isLoading,
    mutate,
  } = useSWR<AnnouncementListItem[]>(`/api/announcements?status=${filter}`, fetcher, {
    keepPreviousData: true,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 880, margin: "0 auto" }}>
      <PageHeader
        title="公告"
        description="查看战队管理员发布的通知与公告"
        actions={
          // 管理员可查看已归档/全部；普通队员只看正常公告
          isAdmin ? (
            <SegmentedFilter
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              ariaLabel="公告筛选"
            />
          ) : undefined
        }
      />

      {isLoading && !items ? (
        <SkeletonList count={4} />
      ) : error && !items ? (
        <ErrorState message={error.message || "加载失败"} onRetry={() => mutate()} />
      ) : !items || items.length === 0 ? (
        <Empty text={filter === "archived" ? "暂无已归档公告" : "暂无公告"} />
      ) : (
        <div className="md-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/announcements/${item.id}`}
              className="win-card win-reveal"
              transitionTypes={["nav-forward"]}
              style={{
                padding: 20,
                display: "block",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {!item.isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          background: "var(--md-sys-color-error)",
                          borderRadius: "50%",
                          flexShrink: 0,
                        }}
                        aria-label="未读"
                      />
                    )}
                    {/* 已归档标签：仅归档的公告展示（类似赛事界面的性质标签） */}
                    {item.isArchived && (
                      <span className="win-chip" style={{ fontSize: 11, flexShrink: 0 }}>
                        已归档
                      </span>
                    )}
                    <h3
                      className="md-typescale-title-medium"
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </h3>
                  </div>
                  <div
                    className="md-typescale-body-small"
                    style={{
                      color: "var(--md-sys-color-on-surface-variant)",
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{item.author.username}</span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    {item.updatedAt !== item.createdAt && <span>已更新</span>}
                    <span>{item.commentCount} 条留言</span>
                  </div>
                </div>
                <MaterialIcon name="keyboard_arrow_right" size={20} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
