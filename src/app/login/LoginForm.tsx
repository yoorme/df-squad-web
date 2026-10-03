"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { prefixDisplayName } from "@/lib/constants";

interface LoginFormProps {
  teamPrefix: string;
  // 图标版本号（iconUpdatedAt 时间戳）：拼在 /favicon.ico?v= 后，
  // 管理员更换图标后刷新页面即可看到新图标（绕过浏览器缓存）
  iconVersion: number;
}

// 校验登录后跳转地址：只允许本站相对路径。
// callbackUrl 来自 URL 查询参数（可被任意构造），直接 router.push 会造成：
//   · 开放重定向（?callbackUrl=https://evil.com 钓鱼）
//   · javascript: 伪协议在应用源内执行脚本
// 规则：必须以单个 "/" 开头（排除 "//evil.com" 协议相对地址与其它任何带 scheme 的串）
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  // 反斜杠会被部分浏览器当作路径分隔符（/\evil.com），一并拒绝
  if (raw.startsWith("/\\")) return "/";
  return raw;
}

export function LoginForm({ teamPrefix, iconVersion }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const toast = useToast();

  const displayName = prefixDisplayName(teamPrefix);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast("请填写用户名和密码", "warning");
      return;
    }
    setLoading(true);
    // 输入框按前缀分离展示，提交时拼成完整用户名（auth 侧也兼容带前缀输入）
    const res = await signIn("credentials", {
      username: teamPrefix + username.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast("用户不存在或者密码错误", "error");
      return;
    }
    toast("登录成功", "success");
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        // M3 表面 + 主色色调（surface 上的大色块，替代旧版渐变）
        background:
          "radial-gradient(1200px 600px at 50% -10%, var(--md-sys-color-primary-container) 0%, transparent 60%), var(--md-sys-color-surface)",
      }}
    >
      <div
        className="md-page-enter"
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 32,
          background: "var(--md-sys-color-surface-container-low)",
          borderRadius: "var(--md-sys-shape-corner-extra-large)",
          boxShadow: "var(--md-sys-elevation-level2)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          {/* 战队图标：始终显示管理后台配置的图标（自定义优先，无则默认）；
              v= 版本号在更换图标后变化，刷新页面即可绕过浏览器缓存 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/favicon.ico?v=${iconVersion}`}
            alt="战队图标"
            width={64}
            height={64}
            style={{
              marginBottom: 16,
              borderRadius: 16,
              imageRendering: "pixelated",
              background: "var(--md-sys-color-surface-container-high)",
              padding: 4,
            }}
          />
          <h1 className="md-typescale-title-large" style={{ fontWeight: 600, marginBottom: 4 }}>
            {displayName}战队报名系统
          </h1>
          <p className="md-typescale-body-small" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
            三角洲行动{displayName ? ` ${displayName} ` : ""}战队
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label className="win-label" htmlFor="login-username">
              昵称
            </label>
            <div className="md-field-group">
              {teamPrefix && <span className="md-field-prefix">{teamPrefix}</span>}
              <input
                id="login-username"
                className="win-input"
                type="text"
                placeholder="请输入昵称"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="win-label" htmlFor="login-password">
              密码
            </label>
            <input
              id="login-password"
              className="win-input"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="win-btn win-btn-primary"
            disabled={loading}
            style={{ marginTop: 4, height: 48 }}
          >
            {loading && <span className="win-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden />}
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 13,
            color: "var(--md-sys-color-on-surface-variant)",
          }}
        >
          还没有账号？
          <Link
            href="/register"
            style={{
              color: "var(--md-sys-color-primary)",
              marginLeft: 4,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            凭邀请码注册
          </Link>
        </div>
      </div>
    </div>
  );
}
