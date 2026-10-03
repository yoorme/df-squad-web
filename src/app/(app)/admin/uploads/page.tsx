"use client";

import { useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import useSWR from "swr";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { fetcher } from "@/lib/fetcher";
import { apiFetch } from "@/lib/client-api";
import { SkeletonList, ErrorState, Empty } from "@/components/ui/StateView";

interface UploadFile {
  name: string;
  path: string;
  size: number;
  referenced: boolean;
  tmp: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function AdminUploadsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [cleaning, setCleaning] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{ files: UploadFile[] }>(
    "/api/admin/uploads",
    fetcher
  );
  const files = data?.files ?? [];

  const tmpFiles = files.filter((f) => f.tmp);
  const orphanFiles = files.filter((f) => !f.tmp && !f.referenced);
  const referencedFiles = files.filter((f) => f.referenced);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const tmpSize = tmpFiles.reduce((s, f) => s + f.size, 0);
  const orphanSize = orphanFiles.reduce((s, f) => s + f.size, 0);

  const handleClean = async (mode: "orphans" | "all" | "tmp") => {
    let msg = "";
    let count = 0;
    if (mode === "tmp") {
      count = tmpFiles.length;
      msg = `将删除 ${count} 个未保存的临时图片（约 ${formatSize(tmpSize)}）。这些是上传后未保存公告的残留文件。是否继续？`;
    } else if (mode === "orphans") {
      count = tmpFiles.length + orphanFiles.length;
      msg = `将删除 ${count} 张未被任何公告引用的图片（含 ${tmpFiles.length} 个临时残留 + ${orphanFiles.length} 张孤儿正式图，约 ${formatSize(tmpSize + orphanSize)}），此操作不可恢复。是否继续？`;
    } else {
      count = referencedFiles.length + orphanFiles.length;
      msg = `高危操作：将删除全部 ${count} 张正式图片（约 ${formatSize(totalSize - tmpSize)}），包括正在被公告引用的！公告中的图片将变为不可显示。此操作不可恢复。是否继续？`;
    }
    const yes = await confirm({ title: mode === "all" ? "删除全部正式图片（高危）" : "清理图片", message: msg, danger: true });
    if (!yes) return;
    setCleaning(true);
    // apiFetch 不抛异常：断网时同样能复位 cleaning 并提示
    const data = await apiFetch<{ deletedCount: number }>(`/api/admin/uploads?mode=${mode}`, {
      method: "DELETE",
    });
    setCleaning(false);
    if (data.ok) {
      toast(`已清理 ${data.data.deletedCount} 个文件`, "success");
      mutate();
    } else {
      toast(data.error || "清理失败", "error");
    }
  };

  const handleDeleteOne = async (file: UploadFile) => {
    const msg = file.tmp
      ? `确定删除临时图片 ${file.name}？`
      : file.referenced
        ? `该图片正被公告引用！删除后公告中图片将不可显示。确定删除 ${file.name}？`
        : `确定删除未引用图片 ${file.name}？`;
    const yes = await confirm({ title: "删除图片", message: msg, danger: true });
    if (!yes) return;
    const data = await apiFetch(`/api/upload?path=${encodeURIComponent(file.path)}`, {
      method: "DELETE",
    });
    if (data.ok) {
      toast("已删除", "success");
      mutate();
    } else {
      toast(data.error || "删除失败", "error");
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}><BackLink href="/admin" label="返回管理首页" /></div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>上传文件管理</h1>
          <p style={{ fontSize: 13, color: "var(--win-text-secondary)" }}>
            共 {files.length} 个文件（{formatSize(totalSize)}）｜临时残留 {tmpFiles.length}（{formatSize(tmpSize)}）｜未引用 {orphanFiles.length}（{formatSize(orphanSize)}）｜已引用 {referencedFiles.length}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tmpFiles.length > 0 && (
            <button className="win-btn" onClick={() => handleClean("tmp")} disabled={cleaning} style={{ fontSize: 12 }}>
              {cleaning ? "清理中..." : `清理临时残留（${tmpFiles.length}）`}
            </button>
          )}
          <button
            className="win-btn"
            onClick={() => handleClean("orphans")}
            disabled={cleaning || (tmpFiles.length + orphanFiles.length) === 0}
            style={{ fontSize: 12 }}
          >
            清理未引用（{tmpFiles.length + orphanFiles.length}）
          </button>
          <button
            className="win-btn"
            onClick={() => handleClean("all")}
            disabled={cleaning || (referencedFiles.length + orphanFiles.length) === 0}
            style={{ fontSize: 12, color: "var(--win-danger)" }}
          >
            删除全部正式
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <SkeletonList count={3} />
      ) : error && !data ? (
        <ErrorState message={error.message || "加载失败"} onRetry={() => mutate()} />
      ) : files.length === 0 ? (
        <Empty text="暂无上传文件" />
      ) : (
        <div className="win-card" style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
            {files.map((file) => (
              <div
                key={file.path}
                style={{
                  position: "relative",
                  borderRadius: 6,
                  overflow: "hidden",
                  border: `1px solid ${
                    file.tmp ? "var(--win-warning)" :
                    file.referenced ? "var(--win-border)" : "var(--win-warning)"
                  }`,
                  aspectRatio: "1",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 上传文件缩略图，尺寸不定 */}
                <img src={file.path} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "rgba(0,0,0,0.6)", color: "white", fontSize: 10,
                  padding: "3px 6px", display: "flex", justifyContent: "space-between",
                }}>
                  <span>{formatSize(file.size)}</span>
                  <span>{file.tmp ? "临时" : file.referenced ? "已引用" : "未引用"}</span>
                </div>
                <button
                  onClick={() => handleDeleteOne(file)}
                  title="删除"
                  style={{
                    position: "absolute", top: 4, right: 4, width: 22, height: 22,
                    borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)",
                    color: "white", cursor: "pointer", fontSize: 11,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
