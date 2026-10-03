"use client";

import { useEffect } from "react";

// ============ 从战队图标取色生成主题（网页版「动态取色」） ============
//
// 安卓 App 在 Android 12+ 使用 Material You：从手机壁纸取种子色，用 HCT 算法
// 生成整套 M3 色彩角色。网页拿不到壁纸，因此以「战队图标」作为种子色源：
//   1. 读取 /favicon.ico（即管理后台上传的战队图标）
//   2. 在 canvas 中统计像素，选出「占比较多且饱和」的主色调作为种子色
//   3. 调用 Material 官方库（@material/material-color-utilities，与安卓端同源算法）
//      生成浅色/深色两套 M3 色彩角色
//   4. 写入 CSS 变量，覆盖 globals.css 中的静态回退配色
//
// 取色失败（图标是黑白灰、图像读取失败等）时不做任何覆盖，
// 页面保持 globals.css 里的静态配色（= App 的回退配色）。

const STORAGE_KEY = "squad-theme-vars";

type Vars = Record<string, string>;
export interface CachedTheme {
  /** 图标版本号：与 SiteSetting.iconUpdatedAt 对应，图标更换后自动重算 */
  v: number;
  /** 提取出的种子色（十六进制，仅用于排查/展示） */
  seed: string;
  vars: { light: Vars; dark: Vars };
}

// M3 色彩角色 → CSS 变量名（与 globals.css 的令牌一一对应）
const ROLE_TO_VAR: Record<string, string> = {
  primary: "--md-sys-color-primary",
  onPrimary: "--md-sys-color-on-primary",
  primaryContainer: "--md-sys-color-primary-container",
  onPrimaryContainer: "--md-sys-color-on-primary-container",
  secondary: "--md-sys-color-secondary",
  onSecondary: "--md-sys-color-on-secondary",
  secondaryContainer: "--md-sys-color-secondary-container",
  onSecondaryContainer: "--md-sys-color-on-secondary-container",
  tertiary: "--md-sys-color-tertiary",
  onTertiary: "--md-sys-color-on-tertiary",
  tertiaryContainer: "--md-sys-color-tertiary-container",
  onTertiaryContainer: "--md-sys-color-on-tertiary-container",
  error: "--md-sys-color-error",
  onError: "--md-sys-color-on-error",
  errorContainer: "--md-sys-color-error-container",
  onErrorContainer: "--md-sys-color-on-error-container",
  background: "--md-sys-color-background",
  surface: "--md-sys-color-surface",
  surfaceDim: "--md-sys-color-surface-dim",
  surfaceBright: "--md-sys-color-surface-bright",
  surfaceContainerLowest: "--md-sys-color-surface-container-lowest",
  surfaceContainerLow: "--md-sys-color-surface-container-low",
  surfaceContainer: "--md-sys-color-surface-container",
  surfaceContainerHigh: "--md-sys-color-surface-container-high",
  surfaceContainerHighest: "--md-sys-color-surface-container-highest",
  onSurface: "--md-sys-color-on-surface",
  onSurfaceVariant: "--md-sys-color-on-surface-variant",
  outline: "--md-sys-color-outline",
  outlineVariant: "--md-sys-color-outline-variant",
  inverseSurface: "--md-sys-color-inverse-surface",
  inverseOnSurface: "--md-sys-color-inverse-on-surface",
  inversePrimary: "--md-sys-color-inverse-primary",
};

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** 按当前明暗模式写入 CSS 变量（内联样式优先级高于 globals.css 与媒体查询） */
function applyTheme(vars: CachedTheme["vars"]) {
  const root = document.documentElement;
  const active = prefersDark() ? vars.dark : vars.light;
  for (const [name, value] of Object.entries(active)) {
    root.style.setProperty(name, value);
  }
}

/**
 * 从图标中提取种子色：
 * 过滤透明/近灰/过亮过暗像素后，按 4bit 量化投票，取「饱和度加权」最高的色簇均色。
 * 返回 [r,g,b]；没有可用色簇（纯黑白灰图标）时返回 null。
 */
async function extractSeed(iconVersion: number): Promise<[number, number, number] | null> {
  const img = new Image();
  img.src = `/favicon.ico?v=${iconVersion}`;
  // decode() 在 ICO 场景下各家浏览器支持度不一，失败则回退到 onload
  await new Promise<void>((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("图标加载失败"));
    // 主动触发一次 decode，能更早发现解码失败
    img.decode?.().then(() => resolve()).catch(() => {});
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 32;
  canvas.height = img.naturalHeight || 32;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const buckets = new Map<number, { weight: number; count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const light = (max + min) / 510; // 0~1
    // 忽略近灰（无彩度）与接近纯黑/纯白的像素——它们无法体现品牌色
    if (sat < 0.2 || light > 0.92 || light < 0.08) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { weight: 0, count: 0, r: 0, g: 0, b: 0 };
    bucket.weight += sat; // 仅用于色簇排名：越鲜艳的色簇越可能代表品牌色
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  let best: { weight: number; count: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) best = bucket;
  }
  if (!best || best.count === 0) return null;
  // 均值必须按「像素个数」平均（weight 只是排名用）；
  // 若用 Σ色值 / Σ饱和度，结果会超出 0~255 得到非法颜色
  return [
    Math.round(best.r / best.count),
    Math.round(best.g / best.count),
    Math.round(best.b / best.count),
  ];
}

/**
 * 生成主题并落盘缓存。
 * 使用 Material 官方 HCT 算法（与安卓端 Material You 同源），
 * 生成 SchemeTonalSpot（Material You 默认变体）的浅色/深色两套角色。
 */
async function buildTheme(iconVersion: number): Promise<CachedTheme | null> {
  const seed = await extractSeed(iconVersion);
  if (!seed) return null;
  const { Hct, SchemeTonalSpot, argbFromRgb, hexFromArgb } = await import(
    "@material/material-color-utilities"
  );
  const hct = Hct.fromInt(argbFromRgb(seed[0], seed[1], seed[2]));

  const buildVars = (dark: boolean): Vars => {
    const scheme = new SchemeTonalSpot(hct, dark, 0);
    const vars: Vars = {};
    for (const [role, cssVar] of Object.entries(ROLE_TO_VAR)) {
      const argb = (scheme as unknown as Record<string, number>)[role];
      if (typeof argb === "number") vars[cssVar] = hexFromArgb(argb);
    }
    return vars;
  };

  const theme: CachedTheme = {
    v: iconVersion,
    seed: `#${seed.map((c) => c.toString(16).padStart(2, "0")).join("")}`,
    vars: { light: buildVars(false), dark: buildVars(true) },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // 隐私模式等场景写入失败：不影响本次生效
  }
  return theme;
}

/**
 * 挂载在根布局：先应用缓存（避免与首屏静态配色来回跳变），
 * 再按当前图标重新取色；系统明暗切换时重新套用对应方案。
 */
export function ThemeFromIcon({ iconVersion }: { iconVersion: number }) {
  useEffect(() => {
    let cancelled = false;

    // 1) 先用缓存立即上色（内联 <head> 脚本已在首屏前应用过一次，这里兜底）
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachedTheme;
        if (cached.v === iconVersion) applyTheme(cached.vars);
      }
    } catch {
      // 缓存损坏：忽略，走重新取色
    }

    // 2) 重新取色（图标可能已更换；同时保证首次访问也能生效）
    void (async () => {
      try {
        const theme = await buildTheme(iconVersion);
        if (!cancelled && theme) applyTheme(theme.vars);
      } catch {
        // 取色失败：保持静态配色
      }
    })();

    // 3) 系统明暗切换时套用另一套角色
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const cached = JSON.parse(raw) as CachedTheme;
        if (cached.v === iconVersion) applyTheme(cached.vars);
      } catch {
        // 忽略
      }
    };
    media.addEventListener("change", onSchemeChange);
    return () => {
      cancelled = true;
      media.removeEventListener("change", onSchemeChange);
    };
  }, [iconVersion]);

  return null;
}
