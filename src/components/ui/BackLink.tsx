"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

// 统一返回链接：M3 文本按钮外观 + nav-back 转场类型
// （携带 nav-back 时，页面级 <ViewTransition> 会播放 shared axis X 的返回动画）
// 图标与 App 一致：Icons.AutoMirrored.Filled.ArrowBack
export function BackLink({ href, label = "返回" }: { href: string; label?: string }) {
  return (
    <Link href={href} transitionTypes={["nav-back"]} className="md-back-link">
      <MaterialIcon name="arrow_back" size={18} />
      <span>{label}</span>
    </Link>
  );
}
