"use client";

import { useState, ViewTransition } from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatDateTime } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";
import { SkeletonList, ErrorState, Empty } from "@/components/ui/StateView";
import { PageHeader } from "@/components/ui/PageHeader";

interface Ability { id: string; name: string; category: "INFANTRY" | "VEHICLE"; }
interface Duty { id: string; name: string; }
interface Operator { id: string; name: string; faction?: string | null; }

interface Member {
  id: string;
  username: string;
  nickname: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  abilities: Ability[];
  duties: Duty[];
  operators: Operator[];
}

export default function MembersPage() {
  const [keyword, setKeyword] = useState("");

  const {
    data: members,
    error,
    isLoading,
    mutate,
  } = useSWR<Member[]>("/api/members", fetcher);

  const all = members ?? [];
  const filtered = keyword.trim()
    ? all.filter((m) => m.nickname.toLowerCase().includes(keyword.trim().toLowerCase()))
    : all;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 880, margin: "0 auto" }}>
      <PageHeader
        title="队员"
        description={`共 ${all.length} 位队员`}
        actions={
          <input
            className="win-input"
            type="text"
            placeholder="搜索昵称"
            aria-label="搜索昵称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 220, maxWidth: "100%" }}
          />
        }
      />

      {isLoading && !members ? (
        <SkeletonList count={5} />
      ) : error && !members ? (
        <ErrorState message={error.message || "加载失败"} onRetry={() => mutate()} />
      ) : filtered.length === 0 ? (
        <Empty text={keyword.trim() ? "未找到匹配的队员" : "暂无队员"} />
      ) : (
        <div className="md-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((m) => {
            const infantry = m.abilities.filter((a) => a.category === "INFANTRY");
            const vehicle = m.abilities.filter((a) => a.category === "VEHICLE");
            return (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="win-card win-reveal"
                transitionTypes={["nav-forward"]}
                style={{
                  padding: 20,
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <ViewTransition name={`member-name-${m.id}`} share="md-shared-morph">
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{m.username}</span>
                      </ViewTransition>
                      <span
                        className="win-chip"
                        style={m.role === "ADMIN" ? { background: "var(--win-bg-selected)", color: "var(--win-accent)", borderColor: "var(--win-accent)", fontSize: 11, padding: "2px 8px" } : { fontSize: 11, padding: "2px 8px" }}
                      >
                        {m.role === "ADMIN" ? "管理员" : "队员"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--win-text-tertiary)" }}>
                      加入于 {formatDateTime(m.createdAt)}
                    </div>
                  </div>
                </div>

                {(infantry.length > 0 || vehicle.length > 0 || m.duties.length > 0 || m.operators.length > 0) && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    {infantry.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--win-text-tertiary)", flexShrink: 0 }}>步兵</span>
                        {infantry.map((a) => (
                          <span key={a.id} className="win-chip win-chip-accent" style={{ fontSize: 12 }}>{a.name}</span>
                        ))}
                      </div>
                    )}
                    {vehicle.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--win-text-tertiary)", flexShrink: 0 }}>载具</span>
                        {vehicle.map((a) => (
                          <span key={a.id} className="win-chip win-chip-accent" style={{ fontSize: 12 }}>{a.name}</span>
                        ))}
                      </div>
                    )}
                    {m.duties.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--win-text-tertiary)", flexShrink: 0 }}>职责</span>
                        {m.duties.map((d) => (
                          <span key={d.id} className="win-chip win-chip-accent" style={{ fontSize: 12 }}>{d.name}</span>
                        ))}
                      </div>
                    )}
                    {m.operators.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--win-text-tertiary)", flexShrink: 0 }}>干员</span>
                        {m.operators.map((o) => (
                          <span key={o.id} className="win-chip win-chip-accent" style={{ fontSize: 12 }}>{o.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
