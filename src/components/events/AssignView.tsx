"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/constants";
import { fetcher } from "@/lib/fetcher";

interface Ability { id: string; name: string; category: string; }
interface Duty { id: string; name: string; }
interface Member {
  registrationId: string;
  userId: string;
  username: string;
  nickname: string;
  abilities: Ability[];
  duties: Duty[];
}
interface Squad {
  id: string;
  index: number;
  capacity: number;
  nature: { id: string; name: string };
  registeredCount: number;
  members: Member[];
}
interface EventDetail {
  id: string;
  title: string;
  eventTime: string;
  squads: Squad[];
  substitutes: Member[];
}

interface Props {
  eventId: string;
  onClose: () => void;
}

// 管理员分配视图：拖拽队员在分队间、分队与替补间移动
//
// 超容暂存 + 合规自动保存：
// - 拖拽只更新本地状态，允许分队暂时超容量（方便来回调换）
// - 超容时显示警告，不落库
// - 所有分队人数 ≤ capacity 时，对比服务器快照自动批量保存
// - 保存失败回滚到服务器快照
export function AssignView({ eventId, onClose }: Props) {
  const toast = useToast();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // 服务器当前分布快照：registrationId → squadId（null = 替补池）。
  // 用 state 而非 ref：待保存变更需要在渲染期读取它参与计算
  const [serverMap, setServerMap] = useState<Map<string, string | null> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // 数据源：SWR 拉取 + onSuccess 播种本地可编辑副本。
  // 关闭聚焦/重连自动刷新，避免拖拽中的本地状态被服务端数据覆盖；
  // 需要在保存失败时回滚 → 显式调用 load()（mutate）
  const {
    isLoading: loading,
    error: loadError,
    mutate: load,
  } = useSWR<EventDetail>(`/api/events?id=${encodeURIComponent(eventId)}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    onSuccess: (data) => {
      setEvent(data);
      setServerMap(buildServerMap(data));
    },
  });

  // 拖拽结束：仅更新本地状态（允许超容），保存由自动保存逻辑统一处理
  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent;
    if (!over) return;
    const regId = String(active.id);
    const targetId = String(over.id); // "sub" 或 squad.id
    const targetSquadId = targetId === "sub" ? null : targetId;

    if (!event) return;
    // 判断当前所在容器，避免同容器内无意义的移动
    const inSquad = event.squads.find((s) => s.members.some((m) => m.registrationId === regId));
    const currentContainer = inSquad ? inSquad.id : "sub";
    if (currentContainer === targetId) return;

    setEvent((prev) => {
      if (!prev) return prev;
      let member: Member | undefined;
      let squads = prev.squads.map((s) => {
        const idx = s.members.findIndex((m) => m.registrationId === regId);
        if (idx >= 0) {
          member = s.members[idx];
          return { ...s, members: s.members.filter((_, i) => i !== idx), registeredCount: s.registeredCount - 1 };
        }
        return s;
      });
      let substitutes = prev.substitutes;
      const subIdx = prev.substitutes.findIndex((m) => m.registrationId === regId);
      if (subIdx >= 0) {
        member = prev.substitutes[subIdx];
        substitutes = prev.substitutes.filter((_, i) => i !== subIdx);
      }
      if (!member) return prev;
      const movedMember = member; // 闭包内 member 类型收窄失效，用常量保存非空值
      if (targetSquadId === null) {
        substitutes = [...substitutes, movedMember];
      } else {
        squads = squads.map((s) =>
          s.id === targetSquadId
            ? { ...s, members: [...s.members, movedMember], registeredCount: s.registeredCount + 1 }
            : s
        );
      }
      return { ...prev, squads, substitutes };
    });
  };

  // 派生状态：超容分队列表 + 未保存的变更
  const overfullSquads = event?.squads.filter((s) => s.registeredCount > s.capacity) ?? [];
  const pendingMoves = (() => {
    if (!event || !serverMap) return [];
    const moves: { registrationId: string; targetSquadId: string | null }[] = [];
    for (const s of event.squads) {
      for (const m of s.members) {
        if (serverMap.get(m.registrationId) !== s.id) {
          moves.push({ registrationId: m.registrationId, targetSquadId: s.id });
        }
      }
    }
    for (const m of event.substitutes) {
      if (serverMap.get(m.registrationId) !== null) {
        moves.push({ registrationId: m.registrationId, targetSquadId: null });
      }
    }
    return moves;
  })();

  // 自动保存：合规（无超容）且有变更时触发。
  // saveNonce 在每次保存结束（无论成败）后 +1 并作为依赖：
  // 保存进行中用户继续拖拽时本次 effect 会因 savingRef 提前返回，
  // 若无 nonce，保存结束后不会再次触发，未保存的变更将被静默丢弃
  const savingRef = useRef(false);
  const [saveNonce, setSaveNonce] = useState(0);
  useEffect(() => {
    if (!event || savingRef.current) return;
    if (overfullSquads.length > 0 || pendingMoves.length === 0) return;

    const doSave = async () => {
      savingRef.current = true;
      setSaving(true);
      try {
        const res = await fetch("/api/events/assign", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id, moves: pendingMoves }),
        });
        const data = await res.json();
        if (data.ok) {
          // 同步服务器快照
          const map = new Map(serverMap ?? []);
          for (const mv of pendingMoves) map.set(mv.registrationId, mv.targetSquadId);
          setServerMap(map);
          if (data.data?.updated > 0) toast("已自动保存", "success");
        } else {
          toast(data.error || "保存失败，已回滚", "error");
          load(); // 回滚到服务器状态
        }
      } catch {
        toast("网络错误，已回滚", "error");
        load();
      } finally {
        savingRef.current = false;
        setSaving(false);
        // 唤醒 effect 再跑一次：保存期间产生的新拖拽会在这一次被提交
        setSaveNonce((n) => n + 1);
      }
    };
    doSave();
    // 依赖 event 与 saveNonce 即可：pendingMoves / overfullSquads 由 event 与
    // serverMap 派生，而 serverMap 只在「保存成功」或「SWR 拉取成功（同时更新 event）」
    // 时变化，两种情况都已由这两个依赖覆盖。把派生值放进依赖会导致保存后重复触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, saveNonce]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--md-sys-color-on-surface-variant)" }}>加载中...</div>;
  }
  if (loadError && !event) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ marginBottom: 12, color: "var(--md-sys-color-error)" }}>
          {loadError.message || "加载失败"}
        </div>
        <button className="win-btn win-btn-secondary" onClick={() => load()}>
          重试
        </button>
      </div>
    );
  }
  if (!event) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--md-sys-color-on-surface-variant)" }}>赛事不存在</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: "var(--win-text-secondary)" }}>
          拖拽队员卡片在分队间移动 · {formatDateTime(event.eventTime)}
          {saving && <span style={{ marginLeft: 8, color: "var(--win-accent)" }}>保存中...</span>}
          {!saving && overfullSquads.length === 0 && pendingMoves.length === 0 && (
            <span style={{ marginLeft: 8, color: "var(--win-success)" }}>已保存</span>
          )}
          {!saving && overfullSquads.length === 0 && pendingMoves.length > 0 && (
            <span style={{ marginLeft: 8, color: "var(--win-warning)" }}>待保存 {pendingMoves.length} 项</span>
          )}
        </div>
        <button className="win-btn win-btn-sm" onClick={onClose}>
          关闭
        </button>
      </div>

      {/* 超容警告：暂存态提示，阻止自动保存 */}
      {overfullSquads.length > 0 && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--md-sys-shape-corner-small)",
            background: "var(--md-sys-color-warning-container)",
            border: "1px solid var(--md-sys-color-warning)",
            fontSize: 13,
            color: "var(--md-sys-color-on-warning-container)",
          }}
        >
          ⚠ 超员未保存：{overfullSquads.map((s) => `第 ${s.index} 队 ${s.registeredCount}/${s.capacity}`).join("、")}
          。可继续拖拽调换，所有分队人数不超过容量后将自动保存。
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {event.squads.map((s) => (
            <SquadColumn key={s.id} squad={s} />
          ))}
        </div>

        {/* 替补池 */}
        <SubstituteColumn substitutes={event.substitutes} />
      </DndContext>
    </div>
  );
}

// 从赛事详情构建服务器分布快照
function buildServerMap(event: EventDetail): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const s of event.squads) {
    for (const m of s.members) map.set(m.registrationId, s.id);
  }
  for (const m of event.substitutes) map.set(m.registrationId, null);
  return map;
}

// 分队列：可放置区域 + 队员卡片
function SquadColumn({ squad }: { squad: Squad }) {
  const { setNodeRef, isOver } = useDroppable({ id: squad.id });
  const full = squad.registeredCount >= squad.capacity;
  const overfull = squad.registeredCount > squad.capacity;

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver
          ? "var(--md-sys-color-secondary-container)"
          : "var(--md-sys-color-surface-container-low)",
        border: `2px dashed ${
          isOver
            ? "var(--md-sys-color-primary)"
            : overfull
              ? "var(--md-sys-color-warning)"
              : full
                ? "var(--md-sys-color-error)"
                : "var(--md-sys-color-outline-variant)"
        }`,
        borderRadius: "var(--md-sys-shape-corner-medium)",
        padding: 12,
        minHeight: 120,
        transition:
          "background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard), border-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          第 {squad.index} 队 · {squad.nature.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: overfull
              ? "var(--md-sys-color-warning)"
              : full
                ? "var(--md-sys-color-error)"
                : "var(--md-sys-color-on-surface-variant)",
          }}
        >
          {squad.registeredCount}/{squad.capacity}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {squad.members.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--win-text-tertiary)", textAlign: "center", padding: 12 }}>
            拖拽队员到此
          </div>
        ) : (
          squad.members.map((m) => <MemberCard key={m.registrationId} member={m} />)
        )}
      </div>
    </div>
  );
}

// 替补池：可放置区域
function SubstituteColumn({ substitutes }: { substitutes: Member[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "sub" });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver
          ? "var(--md-sys-color-secondary-container)"
          : "var(--md-sys-color-surface-container-low)",
        border: `2px dashed ${
          isOver ? "var(--md-sys-color-primary)" : "var(--md-sys-color-outline-variant)"
        }`,
        borderRadius: "var(--md-sys-shape-corner-medium)",
        padding: 12,
        minHeight: 80,
        transition:
          "background-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard), border-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>替补池</span>
        <span style={{ fontSize: 11, color: "var(--md-sys-color-on-surface-variant)" }}>{substitutes.length} 人</span>
      </div>
      {substitutes.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--win-text-tertiary)", textAlign: "center", padding: 12 }}>
          拖拽队员到此降为替补
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {substitutes.map((m) => <MemberCard key={m.registrationId} member={m} />)}
        </div>
      )}
    </div>
  );
}

// 队员卡片：可拖拽
function MemberCard({ member }: { member: Member }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: member.registrationId });
  const duty = member.duties.find((d) => d.name !== "无");
  const abilityLabels = member.abilities.map((a) => a.name).slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        background: "var(--md-sys-color-surface-container-high)",
        border: `1px solid ${
          isDragging ? "var(--md-sys-color-primary)" : "var(--md-sys-color-outline-variant)"
        }`,
        borderRadius: "var(--md-sys-shape-corner-small)",
        padding: "8px 12px",
        cursor: "grab",
        opacity: isDragging ? 0.6 : 1,
        boxShadow: isDragging ? "var(--md-sys-elevation-level2)" : "none",
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        touchAction: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{member.nickname}</span>
        {duty && (
          <span style={{ fontSize: 10, color: "var(--win-warning)" }}>{duty.name}</span>
        )}
      </div>
      {abilityLabels.length > 0 && (
        <div style={{ fontSize: 10, color: "var(--win-text-tertiary)", marginTop: 2 }}>
          {abilityLabels.join("·")}
        </div>
      )}
    </div>
  );
}
