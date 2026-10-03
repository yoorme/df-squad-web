"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import useSWR from "swr";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Loading, ErrorState } from "@/components/ui/StateView";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetcher } from "@/lib/fetcher";

interface Ability { id: string; name: string; category: "INFANTRY" | "VEHICLE"; sortOrder: number; }
interface Duty { id: string; name: string; sortOrder: number; }
interface Operator { id: string; name: string; faction?: string | null; sortOrder: number; }

interface MyInfo {
  id: string;
  username: string;
  nickname: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  teamPrefix: string;
  abilities: Ability[];
  duties: Duty[];
  operators: Operator[];
}

export default function MePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { update } = useSession();

  const { data: info, error, mutate: reloadInfo } = useSWR<MyInfo>("/api/me", fetcher);
  const { data: optionsData } = useSWR<{
    abilities: Ability[];
    duties: Duty[];
    operators: Operator[];
  }>("/api/options", fetcher);
  const options = optionsData ?? { abilities: [], duties: [], operators: [] };

  // 编辑状态
  const [editingNickname, setEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState("");
  const [editingPassword, setEditingPassword] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [editingAbilities, setEditingAbilities] = useState(false);
  const [tempAbilityIds, setTempAbilityIds] = useState<string[]>([]);
  const [editingDuties, setEditingDuties] = useState(false);
  const [tempDutyIds, setTempDutyIds] = useState<string[]>([]);
  const [editingOperators, setEditingOperators] = useState(false);
  const [tempOperatorIds, setTempOperatorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const patch = async (payload: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.error || "保存失败", "error");
        return false;
      }
      toast("保存成功", "success");
      await reloadInfo();
      return true;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!tempNickname.trim()) {
      toast("昵称不能为空", "warning");
      return;
    }
    if (await patch({ nickname: tempNickname.trim() })) {
      // 同步刷新 session 中的用户名，使导航栏等处立即显示新昵称
      await update({ name: (info?.teamPrefix ?? "") + tempNickname.trim() });
      setEditingNickname(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPwd) {
      toast("请输入当前密码", "warning");
      return;
    }
    if (!newPwd || newPwd.length < 6) {
      toast("新密码至少 6 位", "warning");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast("两次密码不一致", "warning");
      return;
    }
    // 旧密码由服务端强制校验（防止会话被盗后绕过前端直接改密），失败会 toast 提示
    if (await patch({ password: newPwd, oldPassword: oldPwd })) {
      // 改密会使 tokenVersion +1（其它设备/App 令牌立即失效）。
      // 这里调用 update() 让服务端重读数据库、把当前会话的版本号同步为新值，
      // 从而「其它设备下线、当前设备保持登录」，避免本人被立即登出
      await update({});
      setEditingPassword(false);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    }
  };

  const handleSaveAbilities = async () => {
    if (await patch({ abilityIds: tempAbilityIds })) {
      setEditingAbilities(false);
    }
  };

  const handleSaveDuties = async () => {
    if (await patch({ dutyIds: tempDutyIds })) {
      setEditingDuties(false);
    }
  };

  const handleSaveOperators = async () => {
    if (await patch({ operatorIds: tempOperatorIds })) {
      setEditingOperators(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "退出登录",
      message: "确定要退出登录吗？",
      confirmText: "退出",
      danger: true,
    });
    if (ok) {
      await signOut({ callbackUrl: "/login" });
    }
  };

  if (!info) {
    if (error) {
      return <ErrorState message={error.message || "加载失败"} onRetry={() => reloadInfo()} />;
    }
    return <Loading />;
  }

  const infantryAbilities = options.abilities.filter((a) => a.category === "INFANTRY");
  const vehicleAbilities = options.abilities.filter((a) => a.category === "VEHICLE");
  const myAbilityIds = info.abilities.map((a) => a.id);
  const myDutyIds = info.duties.map((d) => d.id);
  const myOperatorIds = info.operators.map((o) => o.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760, margin: "0 auto" }}>
      {/* 标题 */}
      <PageHeader title="我的" description="管理你的个人信息" />

      {/* 账号信息卡片 */}
      <section className="win-card win-reveal" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>账号信息</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 用户名 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 80, fontSize: 13, color: "var(--win-text-secondary)" }}>用户名</span>
            <span style={{ fontSize: 14, color: "var(--win-text-tertiary)" }}>{info.username}</span>
          </div>

          {/* 昵称 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 80, fontSize: 13, color: "var(--win-text-secondary)" }}>昵称</span>
            {editingNickname ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div className="md-field-group" style={{ flex: 1, maxWidth: 320 }}>
                  {!!info.teamPrefix && <span className="md-field-prefix">{info.teamPrefix}</span>}
                  <input
                    className="win-input"
                    aria-label="昵称"
                    value={tempNickname}
                    onChange={(e) => setTempNickname(e.target.value)}
                    autoFocus
                  />
                </div>
                <button className="win-btn win-btn-primary win-btn-sm" onClick={handleSaveNickname} disabled={loading}>保存</button>
                <button className="win-btn win-btn-text win-btn-sm" onClick={() => setEditingNickname(false)}>取消</button>
              </div>
            ) : (
              <>
                <span style={{ fontSize: 14 }}>{info.nickname}</span>
                <button
                  className="win-btn"
                  style={{ padding: "4px 10px", minHeight: 28, fontSize: 12 }}
                  onClick={() => { setTempNickname(info.nickname); setEditingNickname(true); }}
                >
                  修改
                </button>
              </>
            )}
          </div>

          {/* 角色 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 80, fontSize: 13, color: "var(--win-text-secondary)" }}>角色</span>
            <span
              className="win-chip"
              style={info.role === "ADMIN" ? { background: "var(--win-bg-selected)", color: "var(--win-accent)", borderColor: "var(--win-accent)" } : {}}
            >
              {info.role === "ADMIN" ? "管理员" : "队员"}
            </span>
          </div>

          {/* 注册时间 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 80, fontSize: 13, color: "var(--win-text-secondary)" }}>注册时间</span>
            <span style={{ fontSize: 14, color: "var(--win-text-secondary)" }}>
              {new Date(info.createdAt).toLocaleString("zh-CN")}
            </span>
          </div>
        </div>
      </section>

      {/* 修改密码 */}
      <section className="win-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>修改密码</h2>
        {editingPassword ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
            <div>
              <label className="win-label">原密码</label>
              <input className="win-input" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
            </div>
            <div>
              <label className="win-label">新密码</label>
              <input className="win-input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            </div>
            <div>
              <label className="win-label">确认新密码</label>
              <input className="win-input" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="win-btn win-btn-primary" onClick={handleSavePassword} disabled={loading}>保存</button>
              <button className="win-btn" onClick={() => { setEditingPassword(false); setOldPwd(""); setNewPwd(""); setConfirmPwd(""); }}>取消</button>
            </div>
          </div>
        ) : (
          <button className="win-btn win-btn-secondary" onClick={() => setEditingPassword(true)}>修改密码</button>
        )}
      </section>

      {/* 能力 */}
      <section className="win-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>能力</h2>
          {editingAbilities ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="win-btn win-btn-primary" onClick={handleSaveAbilities} disabled={loading}>保存</button>
              <button className="win-btn" onClick={() => setEditingAbilities(false)}>取消</button>
            </div>
          ) : (
            <button
              className="win-btn"
              style={{ padding: "4px 10px", minHeight: 28, fontSize: 12 }}
              onClick={() => { setTempAbilityIds(myAbilityIds); setEditingAbilities(true); }}
            >
              编辑
            </button>
          )}
        </div>

        {editingAbilities ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--win-text-secondary)" }}>步兵方向</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {infantryAbilities.map((a) => {
                  const selected = tempAbilityIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      className={`win-chip ${selected ? "win-chip-accent" : ""}`}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => {
                        setTempAbilityIds((prev) =>
                          prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                        );
                      }}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--win-text-secondary)" }}>载具方向</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {vehicleAbilities.map((a) => {
                  const selected = tempAbilityIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      className={`win-chip ${selected ? "win-chip-accent" : ""}`}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => {
                        setTempAbilityIds((prev) =>
                          prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                        );
                      }}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--win-text-tertiary)", marginBottom: 6 }}>步兵方向</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {info.abilities.filter((a) => a.category === "INFANTRY").length === 0 ? (
                  <span style={{ fontSize: 13, color: "var(--win-text-tertiary)" }}>未设置</span>
                ) : (
                  info.abilities.filter((a) => a.category === "INFANTRY").map((a) => (
                    <span key={a.id} className="win-chip win-chip-accent">{a.name}</span>
                  ))
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--win-text-tertiary)", marginBottom: 6 }}>载具方向</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {info.abilities.filter((a) => a.category === "VEHICLE").length === 0 ? (
                  <span style={{ fontSize: 13, color: "var(--win-text-tertiary)" }}>未设置</span>
                ) : (
                  info.abilities.filter((a) => a.category === "VEHICLE").map((a) => (
                    <span key={a.id} className="win-chip win-chip-accent">{a.name}</span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 职责 */}
      <section className="win-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>职责</h2>
          {editingDuties ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="win-btn win-btn-primary" onClick={handleSaveDuties} disabled={loading}>保存</button>
              <button className="win-btn" onClick={() => setEditingDuties(false)}>取消</button>
            </div>
          ) : (
            <button
              className="win-btn"
              style={{ padding: "4px 10px", minHeight: 28, fontSize: 12 }}
              onClick={() => { setTempDutyIds(myDutyIds); setEditingDuties(true); }}
            >
              编辑
            </button>
          )}
        </div>
        {editingDuties ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {options.duties.map((d) => {
              const selected = tempDutyIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  className={`win-chip ${selected ? "win-chip-accent" : ""}`}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => {
                    setTempDutyIds((prev) =>
                      prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                    );
                  }}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {info.duties.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--win-text-tertiary)" }}>未设置</span>
            ) : (
              info.duties.map((d) => (
                <span key={d.id} className="win-chip win-chip-accent">{d.name}</span>
              ))
            )}
          </div>
        )}
      </section>

      {/* 擅长干员 */}
      <section className="win-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>擅长干员</h2>
          {editingOperators ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="win-btn win-btn-primary" onClick={handleSaveOperators} disabled={loading}>保存</button>
              <button className="win-btn" onClick={() => setEditingOperators(false)}>取消</button>
            </div>
          ) : (
            <button
              className="win-btn"
              style={{ padding: "4px 10px", minHeight: 28, fontSize: 12 }}
              onClick={() => { setTempOperatorIds(myOperatorIds); setEditingOperators(true); }}
            >
              编辑
            </button>
          )}
        </div>
        {editingOperators ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {options.operators.map((o) => {
              const selected = tempOperatorIds.includes(o.id);
              return (
                <button
                  key={o.id}
                  className={`win-chip ${selected ? "win-chip-accent" : ""}`}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => {
                    setTempOperatorIds((prev) =>
                      prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id]
                    );
                  }}
                >
                  {o.name}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {info.operators.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--win-text-tertiary)" }}>未设置</span>
            ) : (
              info.operators.map((o) => (
                <span key={o.id} className="win-chip win-chip-accent">{o.name}</span>
              ))
            )}
          </div>
        )}
      </section>

      {/* 退出登录 */}
      <div style={{ marginTop: 8 }}>
        <button className="win-btn win-btn-secondary" onClick={handleLogout} style={{ color: "var(--win-danger)" }}>
          退出登录
        </button>
      </div>
    </div>
  );
}
