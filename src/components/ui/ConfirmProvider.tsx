"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Confirm } from "./Modal";

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  // 用 ref 而不是 state 保存 resolver：
  //  - 避免函数被当作 state 更新器处理
  //  - 新确认框覆盖旧确认框时，能主动把旧 Promise 结束掉，防止 await 永久挂起
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    // 已有确认框未关闭（例如用户连点两次删除）：旧请求按“取消”处理，避免其 await 永不返回
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setState(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState(null);
    resolve?.(result);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Confirm
        open={!!state}
        title={state?.title}
        message={state?.message}
        confirmText={state?.confirmText}
        cancelText={state?.cancelText}
        danger={state?.danger}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm 必须在 ConfirmProvider 内使用");
  return ctx;
}
