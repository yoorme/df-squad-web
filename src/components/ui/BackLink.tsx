"use client";

import Link from "next/link";

// 统一返回链接：M3 文本按钮外观 + nav-back 转场类型
// （携带 nav-back 时，页面级 <ViewTransition> 会播放 shared axis X 的返回动画）
export function BackLink({ href, label = "返回" }: { href: string; label?: string }) {
  return (
    <Link href={href} transitionTypes={["nav-back"]} className="md-back-link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
