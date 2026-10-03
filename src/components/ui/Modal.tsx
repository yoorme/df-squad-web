"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

// 退场动画时长，与 globals.css md-dialog-in 的 medium4 对齐
const EXIT_MS = 200;

// M3 basic dialog：28dp 圆角、surface-container-high 底色、level3 阴影，
// 进出场使用 M3 emphasized 缓动；打开期间锁定滚动并做焦点陷阱
export function Modal({ open, onClose, title, children, footer, maxWidth = "540px" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  // 保留关闭动画：open 变 false 后先播退场再卸载
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // props 变化时在渲染期调整状态（React 官方推荐，避免在 effect 中同步 setState）
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  // onClose 存入 ref 而不放进 effect 依赖：
  // 调用方普遍传内联箭头函数（每次父组件渲染都是新函数），若作为依赖，
  // effect 会在每次父渲染时「清理 + 重跑」——清理把焦点还给上一个元素、
  // 重跑又把焦点抢到弹窗容器上，导致弹窗内输入框每输入一个字符就失焦
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Esc 关闭 + 打开时锁定 body 滚动 + 焦点管理（仅在 open 变化时执行一次）
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      // 简易焦点陷阱：Tab 在弹窗内循环
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    previousFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    // 打开后将焦点移入弹窗：若内部已有元素通过 autoFocus 拿到焦点
    // （React 在提交阶段处理，早于本 effect），则不再抢焦点；
    // 否则聚焦弹窗内第一个可聚焦元素，没有才退回聚焦容器本身
    const active = document.activeElement;
    if (!dialogRef.current?.contains(active)) {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      (target ?? dialogRef.current)?.focus();
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      // 关闭后把焦点还给触发元素
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
    // 只依赖 open：onClose 走 ref；若进依赖数组，父组件每次重渲染都会
    // 触发「还原焦点 → 重新抢焦点」，弹窗内输入会持续失焦
  }, [open]);

  if (!mounted) return null;

  // Portal 到 body：避免被父级 overflow/transform/stacking context 裁剪或遮挡
  return createPortal(
    <div
      className="win-modal-backdrop"
      style={closing ? { animation: "md-scrim-out 200ms ease both" } : undefined}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="win-modal flex flex-col"
        style={{
          maxWidth,
          outline: "none",
          ...(closing
            ? { animation: "md-dialog-out 200ms cubic-bezier(0.3, 0, 0.8, 0.15) both" }
            : null),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="flex items-center justify-between"
            style={{ padding: "24px 24px 0 24px", gap: 16 }}
          >
            <h3
              className="md-typescale-title-large"
              style={{ fontSize: 20, fontWeight: 600, color: "var(--md-sys-color-on-surface)" }}
            >
              {title}
            </h3>
            <button onClick={onClose} className="md-icon-btn" aria-label="关闭">
              <MaterialIcon name="close" size={24} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto" style={{ padding: title ? "16px 24px 8px" : "24px" }}>
          {children}
        </div>
        {footer && (
          <div className="flex justify-end" style={{ padding: "8px 16px 16px", gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// 确认对话框
interface ConfirmProps {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Confirm({
  open,
  title = "确认",
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="420px"
      footer={
        <>
          <button className="win-btn win-btn-text" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={danger ? "win-btn win-btn-danger" : "win-btn win-btn-primary"}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div className="md-typescale-body-medium" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
        {message}
      </div>
    </Modal>
  );
}
