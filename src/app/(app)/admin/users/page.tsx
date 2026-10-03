"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink } from "@/components/ui/BackLink";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { apiFetch, apiJson } from "@/lib/client-api";
import { SkeletonList, ErrorState } from "@/components/ui/StateView";

interface UserItem {
  id: string;
  username: string;
  nickname: string;
  role: "ADMIN" | "MEMBER";
  disabled: boolean;
  createdAt: string;
  _count: { registrations: number };
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const toast = useToast();
  const confirm = useConfirm();

  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data, error, isLoading, mutate } = useSWR<UserItem[]>("/api/admin/users", fetcher);
  const users = data ?? [];

  const handleToggleRole = async (user: UserItem) => {
    const next = user.role === "ADMIN" ? "MEMBER" : "ADMIN";
    const yes = await confirm({
      title: next === "ADMIN" ? "提升为管理员" : "取消管理员",
      message: `确定要将「${user.username}」${next === "ADMIN" ? "提升" : "降级"}为${next === "ADMIN" ? "管理员" : "普通队员"}吗？`,
      danger: next === "MEMBER",
    });
    if (!yes) return;
    const data = await apiJson("/api/admin/users", "PATCH", { id: user.id, role: next });
    if (data.ok) {
      toast("已修改", "success");
      mutate();
    } else {
      toast(data.error || "操作失败", "error");
    }
  };

  const handleToggleDisable = async (user: UserItem) => {
    const next = !user.disabled;
    const yes = await confirm({
      title: next ? "禁用账号" : "启用账号",
      message: `确定要${next ? "禁用" : "启用"}「${user.username}」的账号吗？${next ? "该用户将无法登录。" : ""}`,
      danger: next,
    });
    if (!yes) return;
    const data = await apiJson("/api/admin/users", "PATCH", { id: user.id, disabled: next });
    if (data.ok) {
      toast("已修改", "success");
      mutate();
    } else {
      toast(data.error || "操作失败", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 6) {
      toast("密码至少 6 位", "warning");
      return;
    }
    const data = await apiJson("/api/admin/users", "POST", {
      id: resetTarget.id,
      password: newPassword,
    });
    if (data.ok) {
      toast("密码已重置", "success");
      setResetTarget(null);
      setNewPassword("");
    } else {
      toast(data.error || "重置失败", "error");
    }
  };

  // 硬删除账号：彻底删除用户及其级联数据
  // 非级联数据（创建的公告/赛事/邀请码）转移给当前管理员保留
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDelete = async (user: UserItem) => {
    const yes = await confirm({
      title: "删除账号（不可恢复）",
      message: `确定要彻底删除「${user.username}」吗？\n\n该用户的报名记录、能力/职责/干员标签、公告已读/评论、赛事已读等数据将被永久删除。\n该用户创建的公告、赛事、邀请码将转移给您保留。\n\n此操作不可恢复！`,
      danger: true,
    });
    if (!yes) return;
    setDeletingId(user.id);
    try {
      const data = await apiFetch<{
        deleted: { username: string; registrations: number; announcements: number; events: number; invitationCodes: number };
      }>(`/api/admin/users?id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
      if (data.ok) {
        const d = data.data.deleted;
        toast(`已删除「${d.username}」（报名 ${d.registrations}｜公告 ${d.announcements}｜赛事 ${d.events}｜邀请码 ${d.invitationCodes}）`, "success");
        mutate();
      } else {
        toast(data.error || "删除失败", "error");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}><BackLink href="/admin" label="返回管理首页" /></div>

      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>用户管理</h1>
      <p style={{ fontSize: 13, color: "var(--win-text-secondary)", marginBottom: 24 }}>
        共 {users.length} 名队员
      </p>

      {isLoading && !data ? (
        <SkeletonList count={4} />
      ) : error && !data ? (
        <ErrorState message={error.message || "加载失败"} onRetry={() => mutate()} />
      ) : (
        <div className="win-card" style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--win-border)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--win-text-secondary)", fontWeight: 600 }}>用户名</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--win-text-secondary)", fontWeight: 600 }}>角色</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--win-text-secondary)", fontWeight: 600 }}>状态</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--win-text-secondary)", fontWeight: 600 }}>报名数</th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--win-text-secondary)", fontWeight: 600 }}>注册时间</th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--win-text-secondary)", fontWeight: 600 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--win-border)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <Link href={`/members/${u.id}`} style={{ fontWeight: 500, color: "var(--win-text)", textDecoration: "none" }}>
                      {u.username}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      className="win-chip"
                      style={u.role === "ADMIN" ? { background: "var(--win-bg-selected)", color: "var(--win-accent)", borderColor: "var(--win-accent)", fontSize: 11 } : { fontSize: 11 }}
                    >
                      {u.role === "ADMIN" ? "管理员" : "队员"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="win-chip" style={{ fontSize: 11, ...(u.disabled ? { background: "rgba(209,52,56,0.1)", color: "var(--win-danger)", borderColor: "var(--win-danger)" } : {}) }}>
                      {u.disabled ? "已禁用" : "正常"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{u._count.registrations}</td>
                  <td style={{ padding: "10px 12px", color: "var(--win-text-secondary)", fontSize: 12 }}>{formatDateTime(u.createdAt)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {u.id !== myId && (
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button
                          className="win-btn"
                          style={{ fontSize: 11, padding: "3px 8px", minHeight: 24 }}
                          onClick={() => handleToggleRole(u)}
                        >
                          {u.role === "ADMIN" ? "降级" : "提升"}
                        </button>
                        <button
                          className="win-btn"
                          style={{ fontSize: 11, padding: "3px 8px", minHeight: 24 }}
                          onClick={() => { setResetTarget(u); setNewPassword("123456"); }}
                        >
                          重置密码
                        </button>
                        <button
                          className="win-btn"
                          style={{ fontSize: 11, padding: "3px 8px", minHeight: 24, color: u.disabled ? "var(--win-success)" : "var(--win-danger)" }}
                          onClick={() => handleToggleDisable(u)}
                        >
                          {u.disabled ? "启用" : "禁用"}
                        </button>
                        <button
                          className="win-btn"
                          style={{ fontSize: 11, padding: "3px 8px", minHeight: 24, color: "var(--win-danger)" }}
                          onClick={() => handleDelete(u)}
                          disabled={deletingId === u.id}
                        >
                          {deletingId === u.id ? "删除中..." : "删除"}
                        </button>
                      </div>
                    )}
                    {u.id === myId && (
                      <span style={{ fontSize: 11, color: "var(--win-text-tertiary)" }}>（当前账号）</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="重置密码"
        footer={
          <>
            <button className="win-btn" onClick={() => setResetTarget(null)}>取消</button>
            <button className="win-btn win-btn-primary" onClick={handleResetPassword}>确认重置</button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: 13, marginBottom: 12, color: "var(--win-text-secondary)" }}>
            将为 <b>{resetTarget?.username}</b> 重置密码，重置后请将新密码告知该队员。
          </p>
          <label className="win-label">新密码</label>
          <input
            className="win-input"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="至少 6 位"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}
