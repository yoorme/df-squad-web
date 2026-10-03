// 客户端请求封装（与服务端 lib/api.ts 的 { ok, data } / { ok, error } 响应格式配套）
//
// 存在的意义：原生 fetch 在断网/代理返回非 JSON 时会 reject 或抛异常，
// 调用方若写成
//     setSaving(true);
//     const res = await fetch(...);     // ← 这里抛错
//     const data = await res.json();
//     setSaving(false);                 // ← 永远不会执行
// 按钮就会永久停在「保存中…」。本封装把所有异常都收敛成返回值，
// 调用方只需判断 `ok`，busy 状态自然能够复位。

export interface ApiOk<T> {
  ok: true;
  data: T;
  status: number;
}
export interface ApiFail {
  ok: false;
  error: string;
  status: number;
}
export type ApiResponse<T = unknown> = ApiOk<T> | ApiFail;

export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    // 网络不可达 / 请求被中断
    return { ok: false, error: "网络错误，请稍后重试", status: 0 };
  }

  const body = (await res.json().catch(() => null)) as
    | { ok?: boolean; data?: T; error?: string }
    | null;

  if (body && body.ok === true) {
    return { ok: true, data: body.data as T, status: res.status };
  }
  return {
    ok: false,
    // 非 JSON 响应（如代理返回的 HTML 错误页）也给出可读提示
    error: body?.error || (res.ok ? "服务器返回异常" : `请求失败（${res.status}）`),
    status: res.status,
  };
}

/** JSON 请求的便捷封装 */
export function apiJson<T = unknown>(url: string, method: string, payload?: unknown) {
  return apiFetch<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}
