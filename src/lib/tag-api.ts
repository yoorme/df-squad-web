// 标签管理 API 统一封装（/api/admin/tags）
// admin/tags 管理页与 TagEditor 内联编辑器共用，消除重复的 fetch 样板
import { apiFetch } from "@/lib/client-api";
import type { TagType } from "@/types";

interface TagApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function post<T>(body: Record<string, unknown>): Promise<TagApiResult<T>> {
  // apiFetch 已把网络异常收敛为返回值，调用方无需 try/catch
  return apiFetch<T>("/api/admin/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchTags<T = unknown>(type: TagType): Promise<T[]> {
  const res = await apiFetch<T[]>(`/api/admin/tags?type=${type}`);
  return res.ok ? res.data : [];
}

export function createTag(
  type: TagType,
  payload: { name: string; category?: string; faction?: string }
) {
  return post<{ id: string }>({ type, op: "create", ...payload });
}

export function updateTag(
  type: TagType,
  payload: { id: string; name: string; category?: string; faction?: string }
) {
  return post({ type, op: "update", ...payload });
}

export function deleteTag(type: TagType, id: string) {
  return post<{ success?: boolean; cascadeEvents?: number; cascadeSquads?: number; cascadeUsers?: number }>({ type, op: "delete", id });
}

export function toggleTagDisabled(type: TagType, id: string, disabled: boolean) {
  return post({ type, op: "toggleDisable", id, disabled });
}

export function reorderTags(type: TagType, orderedIds: string[]) {
  return post({ type, op: "reorder", orderedIds });
}
