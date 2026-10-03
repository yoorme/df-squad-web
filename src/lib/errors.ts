// 通用错误判定工具（服务端）

/**
 * 判断捕获到的异常是否为指定 errno 的 Node 系统错误（如 ENOENT / EEXIST）。
 * 用法：`if (isErrno(e, "ENOENT")) { ... }`，避免 `catch (e: any)`。
 */
export function isErrno(e: unknown, code: string): boolean {
  return e instanceof Error && (e as NodeJS.ErrnoException).code === code;
}
