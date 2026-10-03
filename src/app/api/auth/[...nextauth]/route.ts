import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";
import { rateLimit, clientIp, isTrustingProxy } from "@/lib/rate-limit";

export const { GET } = handlers;

// 判断本次请求是否为 credentials 登录回调。
//
// 不能简单用 pathname.endsWith("/callback/credentials")：
// Next 的路由正则对动态路由追加可选尾斜杠（route-regex.js 的 `(?:/)?`），
// 因此 `/api/auth/callback/credentials/` 同样会命中本处理器；
// 而 Auth.js 解析 action 时是 `split("/").filter(Boolean)`（@auth/core/lib/utils/web.js），
// 尾斜杠会被忽略、照常认证 —— 只按 endsWith 判断会让带尾斜杠的登录请求完全绕过限流。
//
// 这里复用与 Auth.js 相同的解析方式（取路径最后两段），保证判断逻辑与真正执行的逻辑一致。
function isCredentialsCallback(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return (
    segments.length >= 2 &&
    segments[segments.length - 2] === "callback" &&
    segments[segments.length - 1] === "credentials"
  );
}

// 仅对 credentials 登录回调限流，防止密码爆破。
// 双维度：
//   1. IP 维度 —— 反代后按真实 IP 5 次/分钟；直接暴露时所有客户端共享桶放宽到 30 次/分钟
//      （直连时 IP 可被伪造头轮换绕过，真正防线是下面的用户名维度）
//   2. 用户名维度 —— 同一账号 10 次/分钟，伪造任何头都无法提高单账号爆破速度
// 其他 POST（如 signout、session 刷新）不受影响
export async function POST(req: NextRequest) {
  if (isCredentialsCallback(req.nextUrl.pathname)) {
    const clone = req.clone();
    let username = "";
    try {
      const form = await clone.formData();
      username = String(form.get("username") ?? "").trim().toLowerCase();
    } catch {
      // 表单解析失败交给 NextAuth 返回标准错误
    }

    const ipLimit = isTrustingProxy() ? 5 : 30;
    const rlIp = rateLimit(`login:${clientIp(req)}`, ipLimit, 60_000);
    if (!rlIp.success) {
      return tooMany(rlIp.retryAfterSeconds);
    }
    if (username) {
      const rlUser = rateLimit(`loginuser:${username}`, 10, 60_000);
      if (!rlUser.success) {
        return tooMany(rlUser.retryAfterSeconds);
      }
    }
  }
  return handlers.POST(req);
}

function tooMany(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "尝试过于频繁，请稍后再试" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
