"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastType = "info" | "success" | "error" | "warning";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType) => void;
} | null>(null);

let toastId = 0;

// 每条提示的展示时长（M3 snackbar 建议 4s；错误稍长便于阅读）
const DURATION: Record<ToastType, number> = {
  info: 3000,
  success: 3000,
  error: 4500,
  warning: 4000,
};
// 退场动画时长，与 globals.css 的 md-snackbar-out 保持一致
const EXIT_MS = 200;

// M3 Snackbar：同一时刻只展示一条，其余排队依次展示（避免堆叠遮挡内容）
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const [leaving, setLeaving] = useState(false);
  const queueRef = useRef<ToastItem[]>([]);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 依次出队展示：一条播完（含退场动画）再播下一条。
  // 用 ref 持有自身以便在定时器里递归调用（避免 useCallback 自引用）
  //
  // 初始化时序：子组件的 effect 先于父组件执行，若子组件在挂载时就 toast()，
  // 此时 pumpRef 仍是占位函数（真实实现在本组件的 effect 里赋值）。
  // 因此占位函数只标记「有待处理的队列」，由挂载 effect 赋值后立即补一次 pump，
  // 否则第一条提示会被静默延迟到下一条 toast 才显示。
  const pendingRef = useRef(false);
  const pumpRef = useRef<() => void>(() => {
    pendingRef.current = true;
  });

  useEffect(() => {
    pumpRef.current = () => {
      const next = queueRef.current.shift();
      if (!next) {
        busyRef.current = false;
        return;
      }
      busyRef.current = true;
      setCurrent(next);
      setLeaving(false);
      timerRef.current = setTimeout(() => {
        setLeaving(true);
        timerRef.current = setTimeout(() => {
          setCurrent(null);
          setLeaving(false);
          pumpRef.current();
        }, EXIT_MS);
      }, DURATION[next.type]);
    };

    // 补偿：挂载前若有 toast 进入队列，这里立即展示
    if (pendingRef.current) {
      pendingRef.current = false;
      pumpRef.current();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 稳定的 toast 函数（不随渲染变化，避免消费组件无谓重渲染）
  const toast = useCallback((message: string, type: ToastType = "info") => {
    queueRef.current.push({ id: ++toastId, type, message });
    if (!busyRef.current) pumpRef.current();
  }, []);

  const icons: Record<ToastType, ReactNode> = {
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
      </svg>
    ),
    success: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    error: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16h.01" strokeLinecap="round" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3.5l9 15.5H3z" strokeLinejoin="round" />
        <path d="M12 9.5v4M12 16.5h.01" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        id="toast-container"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
          width: "min(100% - 32px, 480px)",
        }}
      >
        {current && (
          <div className="md-snackbar" data-type={current.type} data-leaving={leaving || undefined} role="status">
            <span className="md-snackbar-icon" aria-hidden>
              {icons[current.type]}
            </span>
            <span style={{ flex: 1 }}>{current.message}</span>
          </div>
        )}
      </div>
      <style>{`
        @media (min-width: 768px) {
          #toast-container { bottom: 24px !important; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast 必须在 ToastProvider 内使用");
  return ctx.toast;
}
