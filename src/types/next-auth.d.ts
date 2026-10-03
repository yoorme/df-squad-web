// NextAuth 会话类型扩展：消除项目中遍地的 (session.user as any)
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      nickname: string;
      // 令牌版本：与 User.tokenVersion 比对，改密/重置密码后旧会话立即失效。
      // 旧的（本次改动前签发的）会话没有该字段，值为 undefined → 跳过校验，
      // 用户重新登录后自动纳入校验
      ver?: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: Role;
    nickname: string;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    nickname?: string;
    ver?: number;
  }
}
