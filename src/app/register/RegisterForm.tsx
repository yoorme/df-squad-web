"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

interface RegisterFormProps {
  teamPrefix: string;
}

export function RegisterForm({ teamPrefix }: RegisterFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [invitationCode, setInvitationCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationCode.trim() || !nickname.trim() || !password) {
      toast("请填写所有字段", "warning");
      return;
    }
    if (teamPrefix && nickname.trim().startsWith(teamPrefix)) {
      toast(`昵称无需填写「${teamPrefix}」前缀`, "warning");
      return;
    }
    if (password.length < 6) {
      toast("密码至少 6 位", "warning");
      return;
    }
    if (password !== confirmPassword) {
      toast("两次密码不一致", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationCode: invitationCode.trim(),
          nickname: nickname.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.error || "注册失败", "error");
        setLoading(false);
        return;
      }
      toast("注册成功，正在登录...", "success");
      // 自动登录
      await signIn("credentials", {
        username: data.data.username,
        password,
        redirect: false,
      });
      router.push("/");
      router.refresh();
    } catch {
      toast("网络错误", "error");
      setLoading(false);
    }
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
          maxWidth: 420,
          padding: 32,
          background: "var(--md-sys-color-surface-container-low)",
          borderRadius: "var(--md-sys-shape-corner-extra-large)",
          boxShadow: "var(--md-sys-elevation-level2)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 className="md-typescale-title-large" style={{ fontWeight: 600, marginBottom: 4 }}>
            队员注册
          </h1>
          <p className="md-typescale-body-small" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
            需要从管理员处获取邀请码
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="win-label">邀请码</label>
            <input
              className="win-input"
              type="text"
              placeholder="请输入邀请码"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="win-label" htmlFor="reg-nickname">昵称</label>
            <div className="md-field-group">
              {teamPrefix && <span className="md-field-prefix">{teamPrefix}</span>}
              <input
                id="reg-nickname"
                className="win-input"
                type="text"
                placeholder="请输入昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="win-label" htmlFor="reg-password">密码</label>
            <input
              id="reg-password"
              className="win-input"
              type="password"
              placeholder="至少 6 位"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="win-label" htmlFor="reg-confirm">确认密码</label>
            <input
              id="reg-confirm"
              className="win-input"
              type="password"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="win-btn win-btn-primary"
            disabled={loading}
            style={{ marginTop: 4, height: 48 }}
          >
            {loading && <span className="win-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden />}
            {loading ? "注册中..." : "注册并登录"}
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
          已有账号？
          <Link
            href="/login"
            style={{
              color: "var(--md-sys-color-primary)",
              marginLeft: 4,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
