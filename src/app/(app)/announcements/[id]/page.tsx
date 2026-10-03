"use client";

import { useState, ViewTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Markdown } from "@/components/ui/Markdown";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { formatDateTime } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { apiFetch, apiJson } from "@/lib/client-api";
import { SkeletonDetail, ErrorState } from "@/components/ui/StateView";
import { BackLink } from "@/components/ui/BackLink";

interface AnnouncementDetail {
  id: string;
  title: string;
  contentMarkdown: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; username: string; nickname: string };
  images: { id: string; path: string }[];
  isRead: boolean;
  comments: {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; username: string; nickname: string };
    isMine?: boolean;
  }[];
}

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const confirm = useConfirm();

  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  const { data: detail, error, isLoading, mutate: load } = useSWR<AnnouncementDetail>(
    params.id ? `/api/announcements?mode=detail&id=${encodeURIComponent(params.id)}` : null,
    fetcher
  );

  // 归档/恢复（管理员）：归档后普通队员不可见
  const handleToggleArchive = async () => {
    if (!detail) return;
    const next = !detail.isArchived;
    const yes = await confirm({
      title: next ? "归档公告" : "恢复公告",
      message: next
        ? "归档后该公告将对普通队员隐藏（仅管理员可见），确定归档吗？"
        : "恢复后该公告将重新对全体队员可见，确定恢复吗？",
      confirmText: next ? "归档" : "恢复",
      danger: next,
    });
    if (!yes) return;
    const data = await apiJson("/api/announcements", "PATCH", { id: params.id, isArchived: next });
    if (data.ok) {
      toast(next ? "已归档" : "已恢复", "success");
      load();
      router.refresh(); // 刷新导航红点
    } else {
      toast(data.error || "操作失败", "error");
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast("请输入留言内容", "warning");
      return;
    }
    setSubmittingComment(true);
    const data = await apiJson("/api/announcements/comments", "POST", {
      announcementId: params.id,
      content: commentText.trim(),
    });
    setSubmittingComment(false);
    if (data.ok) {
      setCommentText("");
      toast("留言已发布", "success");
      load();
    } else {
      toast(data.error || "发布失败", "error");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const yes = await confirm({
      title: "删除留言",
      message: "确定要删除这条留言吗？",
      confirmText: "删除",
      danger: true,
    });
    if (!yes) return;
    const data = await apiFetch(`/api/announcements/comments?id=${commentId}`, { method: "DELETE" });
    if (data.ok) {
      toast("已删除", "success");
      load();
    } else {
      toast(data.error || "删除失败", "error");
    }
  };

  const handleDeleteAnnouncement = async () => {
    const yes = await confirm({
      title: "删除公告",
      message: "确定要删除此公告吗？删除后无法恢复，关联的留言也会一并删除。",
      confirmText: "删除",
      danger: true,
    });
    if (!yes) return;
    const data = await apiFetch(`/api/announcements?id=${params.id}`, { method: "DELETE" });
    if (data.ok) {
      toast("已删除", "success");
      router.push("/announcements");
      router.refresh();
    } else {
      toast(data.error || "删除失败", "error");
    }
  };

  if (isLoading && !detail) {
    return <SkeletonDetail />;
  }
  if (error && !detail) {
    return <ErrorState message={error.message || "加载失败"} onRetry={() => load()} />;
  }
  if (!detail) {
    return <div className="win-card" style={{ padding: 40, textAlign: "center" }}>公告不存在</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 880, margin: "0 auto" }}>
      <BackLink href="/announcements" label="返回公告列表" />

      {/* 公告主体 */}
      <article className="win-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              {detail.isArchived && (
                <span className="win-chip" style={{ fontSize: 11, background: "var(--win-bg-pressed)", color: "var(--win-text-tertiary)", flexShrink: 0 }}>
                  已归档
                </span>
              )}
              <ViewTransition name={`announcement-title-${detail.id}`} share="md-shared-morph">
                <h1 className="md-typescale-title-large" style={{ fontSize: 22, fontWeight: 600 }}>
                  {detail.title}
                </h1>
              </ViewTransition>
            </div>
            <div style={{ fontSize: 12, color: "var(--win-text-tertiary)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Link href={`/members/${detail.author.id}`} style={{ color: "var(--win-text-secondary)", textDecoration: "none" }}>{detail.author.username}</Link>
              <span>发布于 {formatDateTime(detail.createdAt)}</span>
              {detail.updatedAt !== detail.createdAt && <span>更新于 {formatDateTime(detail.updatedAt)}</span>}
            </div>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Link href={`/admin/announcements/${detail.id}/edit`} className="win-btn win-btn-secondary" style={{ fontSize: 12, padding: "4px 10px", minHeight: 28 }}>
                编辑
              </Link>
              <button onClick={handleToggleArchive} className="win-btn" style={{ fontSize: 12, padding: "4px 10px", minHeight: 28 }}>
                {detail.isArchived ? "恢复" : "归档"}
              </button>
              <button onClick={handleDeleteAnnouncement} className="win-btn win-btn-danger" style={{ fontSize: 12, padding: "4px 10px", minHeight: 28 }}>
                删除
              </button>
            </div>
          )}
        </div>

        {/* 正文：仅渲染 markdown 中的图片
            images 表中未引用的图片是管理员保留的备用图，不在详情页展示
            （管理员可在编辑器重新插入到 markdown 中） */}
        <Markdown content={detail.contentMarkdown} />
      </article>

      {/* 评论区 */}
      <section className="win-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          留言（{detail.comments.length}）
        </h2>

        {/* 发表留言 */}
        <div style={{ marginBottom: 20 }}>
          <textarea
            className="win-input win-textarea"
            placeholder="发表留言..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={500}
            style={{ minHeight: 80 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "var(--win-text-tertiary)" }}>{commentText.length}/500</span>
            <button
              className="win-btn win-btn-primary"
              onClick={handleSubmitComment}
              disabled={submittingComment || !commentText.trim()}
            >
              {submittingComment ? "发布中..." : "发布"}
            </button>
          </div>
        </div>

        {/* 留言列表 */}
        {detail.comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--win-text-tertiary)", fontSize: 13 }}>
            暂无留言，来说点什么吧
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {detail.comments.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: 12,
                  background: "var(--win-bg-hover)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Link href={`/members/${c.user.id}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--win-text)", textDecoration: "none" }}>{c.user.username}</Link>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--win-text-tertiary)" }}>{formatDateTime(c.createdAt)}</span>
                    {(c.isMine || isAdmin) && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--win-danger)",
                          fontSize: 11,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "var(--win-text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {c.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
