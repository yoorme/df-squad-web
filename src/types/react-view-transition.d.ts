// React 19.2 <ViewTransition> 的补充类型声明。
//
// 背景：Next.js 16 的 App Router 在构建时会把 `react` 别名为内置的 React canary
// （next/dist/compiled/react），运行时确实导出 ViewTransition（Symbol 元素类型，
// 由 reconciler 特判渲染）；但 @types/react 19.2.x 尚未包含该组件的类型，
// 因此在此处补齐，供 src/components/layout/AppShell.tsx 等页面转场使用。
//
// 参考：Next.js 文档《Designing view transitions》与 React <ViewTransition> API。
import type { ComponentType, ReactNode } from "react";

declare module "react" {
  /** 转场类名，或按 transition type 分派的映射表（default 为兜底） */
  export type ViewTransitionClass = string;
  export type ViewTransitionMap = Record<string, ViewTransitionClass>;

  export interface ViewTransitionProps {
    children?: ReactNode;
    /** 视图过渡名（同一 name 的旧/新元素会做共享元素形变） */
    name?: string;
    /** 进入动画类 */
    enter?: ViewTransitionClass | ViewTransitionMap;
    /** 退出动画类 */
    exit?: ViewTransitionClass | ViewTransitionMap;
    /** 同一路由内更新时的动画类 */
    update?: ViewTransitionClass | ViewTransitionMap;
    /** 共享元素形变动画类（如 "auto" 使用默认交叉淡化） */
    share?: ViewTransitionClass | ViewTransitionMap;
    /** 未匹配到 transition type 时的默认动画类，"none" 表示不参与动画 */
    default?: ViewTransitionClass;
  }

  export const ViewTransition: ComponentType<ViewTransitionProps>;
}
