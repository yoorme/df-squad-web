"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { formatDateTime } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { SkeletonDetail, ErrorState } from "@/components/ui/StateView";
import { BackLink } from "@/components/ui/BackLink";

interface Ability { id: string; name: string; category: "INFANTRY" | "VEHICLE"; }
interface Duty { id: string; name: string; }
interface Operator { id: string; name: string; faction?: string | null; }

interface MemberDetail {
  id: string;
  username: string;
  nickname: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  abilities: Ability[];
  duties: Duty[];
  operators: Operator[];
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: member, error, isLoading, mutate } = useSWR<MemberDetail>(
    params.id ? `/api/members/${encodeURIComponent(params.id)}` : null,
    fetcher
  );

  if (isLoading && !member) {
    return <SkeletonDetail />;
  }
  if (error && !member) {
    return <ErrorState message={error.message || "加载失败"} onRetry={() => mutate()} />;
  }
  if (!member) {
    return (
      <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <BackLink href="/members" label="返回队员列表" />
        <div className="win-card" style={{ padding: 40, textAlign: "center" }}>队员不存在</div>
      </div>
    );
  }

  const infantry = member.abilities.filter((a) => a.category === "INFANTRY");
  const vehicle = member.abilities.filter((a) => a.category === "VEHICLE");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 880, margin: "0 auto" }}>
      <BackLink href="/members" label="返回队员列表" />

      {/* 基本信息 */}
      <section className="win-card win-reveal" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <h1 className="md-typescale-title-large" style={{ fontSize: 22, fontWeight: 600 }}>{member.username}</h1>
          <span
            className="win-chip"
            style={member.role === "ADMIN" ? { background: "var(--win-bg-selected)", color: "var(--win-accent)", borderColor: "var(--win-accent)", fontSize: 11, padding: "2px 8px" } : { fontSize: 11, padding: "2px 8px" }}
          >
            {member.role === "ADMIN" ? "管理员" : "队员"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--win-text-tertiary)" }}>
          加入于 {formatDateTime(member.createdAt)}
        </div>
      </section>

      {/* 能力 */}
      <section className="win-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>能力</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--win-text-tertiary)", marginBottom: 6 }}>步兵方向</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {infantry.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--win-text-tertiary)" }}>未设置</span>
              ) : (
                infantry.map((a) => (
                  <span key={a.id} className="win-chip win-chip-accent" style={{ fontSize: 12 }}>{a.name}</span>
                ))
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--win-text-tertiary)", marginBottom: 6 }}>载具方向</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {vehicle.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--win-text-tertiary)" }}>未设置</span>
              ) : (
                vehicle.map((a) => (
                  <span key={a.id} className="win-chip win-chip-accent" style={{ fontSize: 12 }}>{a.name}</span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 职责 */}
      <section className="win-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>职责</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {member.duties.length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--win-text-tertiary)" }}>未设置</span>
          ) : (
            member.duties.map((d) => (
              <span key={d.id} className="win-chip win-chip-accent" style={{ fontSize: 12 }}>{d.name}</span>
            ))
          )}
        </div>
      </section>

      {/* 擅长干员 */}
      <section className="win-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>擅长干员</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {member.operators.length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--win-text-tertiary)" }}>未设置</span>
          ) : (
            member.operators.map((o) => (
              <span key={o.id} className="win-chip win-chip-accent" style={{ fontSize: 12 }}>{o.name}</span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

