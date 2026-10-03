import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 部署：输出 standalone 产物，镜像体积更小
  output: "standalone",
  allowedDevOrigins: ["remote-agent.svc.cluster.local", "*.remote-agent.svc.cluster.local"],
  // 生产构建优化
  poweredByHeader: false,
  compress: true,
  // Turbopack（Next 16 起为默认打包器）工作区根目录。
  // 不显式指定时，若用户主目录等上层目录存在 pnpm-lock.yaml 等其他锁文件，
  // Turbopack 会误判工作区根并触发告警，影响模块解析与缓存命中。
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // React 19.2 <ViewTransition>：路由切换 / 加载完成 / 同路由内容切换的
    // Material Design 3 动效（shared axis · fade through），
    // CSS 动画定义见 globals.css 第 16 节；不支持的浏览器自动降级为无动画
    viewTransition: true,
  },
  // 基础安全响应头。
  // 注：/_next/static 的 Cache-Control 由 Next 自动设置为
  // public, max-age=31536000, immutable，无需（也不应）在此重复配置，
  // 自定义该头会触发构建告警并可能破坏 dev 行为。
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
