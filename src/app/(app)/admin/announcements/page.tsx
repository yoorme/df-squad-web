"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { formatDateTime } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { apiFetch, apiJson } from "@/lib/client-api";
import { SkeletonList, ErrorState, Empty } from "@/components/ui/StateView";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";

interface AnnouncementItem {
  id: string;
  title: string;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

type StatusFilter = "normal" | "archived" | "all";

const FILTERS = [
  { value: "all" as const, label: "全部" },
  { value: "normal" as const, label: "正常" },
  { value: "archived" as const, label: "已归档" },
];

// 公告管理：全部/正常/已归档 tab 切换，支持归档/恢复/编辑/删除
// 已归档公告仅在此处（及公告列表的管理员视图）可见
export default function AdminAnnouncementsPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [filter, setFilter] = useState<StatusFilter>("all");

  const { data, error, isLoading, mutate } = useSWR<{ announcements: AnnouncementItem[] }>(
    `/api/admin/announcements?status=${filter}`,
    fetcher,
    { keepPreviousData: true }
  );
  const items = data?.announcements ?? [];

  // 归档/恢复
  const handleToggleArchive = async (item: AnnouncementItem) => {
    const next = !item.isArchived;
    const yes = await confirm({
      title: next ? "归档公告" : "恢复公告",
      message: next
        ? `归档后「${item.title}」将对普通队员隐藏（仅管理员可见），确定归档吗？`
        : `恢复后「${item.title}」将重新对全体队员可见，确定恢复吗？`,
      confirmText: next ? "归档" : "恢复",
      danger: next,
    });
    if (!yes) return;
    const result = await apiJson("/api/announcements", "PATCH", { id: item.id, isArchived: next });
    if (result.ok) {
      toast(next ? "已归档" : "已恢复", "success");
      mutate();
    } else {
      toast(result.error || "操作失败", "error");
    }
  };

  const handleDelete = async (item: AnnouncementItem) => {
    const yes = await confirm({
      title: "删除公告",
      message: `确定要删除公告「${item.title}」吗？关联的留言和图片会一并删除，无法恢复。`,
      danger: true,
    });
    if (!yes) return;
    const result = await apiFetch(`/api/announcements?id=${item.id}`, { method: "DELETE" });
    if (result.ok) {
      toast("已删除", "success");
      mutate();
    } else {
      toast(result.error || "删除失败", "error");
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/admin" transitionTypes={["nav-back"]} className="md-back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>返回管理首页</span>
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="md-typescale-headline-small" style={{ fontWeight: 600, marginBottom: 4 }}>公告管理</h1>
          <p className="md-typescale-body-small" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>共 {items.length} 条公告 · 已归档的公告仅管理员可见</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SegmentedFilter options={FILTERS} value={filter} onChange={setFilter} ariaLabel="公告状态筛选" />
          <Link href="/admin/announcements/new" className="win-btn win-btn-primary">发布公告</Link>
        </div>
      </div>

      {isLoading && !data ? (
        <SkeletonList count={4} />
      ) : error && !data ? (
        <ErrorState message={error.message || "加载失败"} onRetry={() => mutate()} />
      ) : items.length === 0 ? (
        <Empty text="暂无公告" />
      ) : (
        <div className="win-card" style={{ overflow: "hidden" }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                borderBottom: idx === items.length - 1 ? "none" : "1px solid var(--win-border)",
                flexWrap: "wrap",
                gap: 8,
                opacity: item.isArchived ? 0.75 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {/* 已归档标签：仅归档的公告展示 */}
                  {item.isArchived && (
                    <span className="win-chip" style={{ fontSize: 11, background: "var(--win-bg-pressed)", color: "var(--win-text-tertiary)", flexShrink: 0 }}>
                      已归档
                    </span>
                  )}
                  <Link
                    href={`/announcements/${item.id}`}
                    style={{ fontSize: 14, fontWeight: 500, color: "var(--win-text)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
                  >
                    {item.title}
                  </Link>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--win-text-tertiary)", flexWrap: "wrap" }}>
                  <span>{formatDateTime(item.createdAt)}</span>
                  <span>留言 {item.commentCount}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Link href={`/admin/announcements/${item.id}/edit`} className="win-btn win-btn-sm" style={{ textDecoration: "none" }}>
                  编辑
                </Link>
                <button className="win-btn win-btn-sm" onClick={() => handleToggleArchive(item)}>
                  {item.isArchived ? "恢复" : "归档"}
                </button>
                <button className="win-btn win-btn-sm win-btn-text" style={{ color: "var(--md-sys-color-error)" }} onClick={() => handleDelete(item)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 上传文件管理入口 */}
      <Link
        href="/admin/uploads"
        className="win-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          marginTop: 16,
          textDecoration: "none",
          color: "var(--win-text)",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>上传文件管理</div>
          <div style={{ fontSize: 12, color: "var(--win-text-tertiary)", marginTop: 2 }}>
            查看全部图片、清理未引用的孤儿文件、释放磁盘空间
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </div>
  );
}
