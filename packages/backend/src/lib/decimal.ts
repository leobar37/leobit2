const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

function sanitize(s: string): string {
  if (!s || s.trim() === "") return "0";
  if (!NUMERIC_RE.test(s)) return "0";
  return s;
}

export function add(a: string, b: string): string {
  const sa = sanitize(a);
  const sb = sanitize(b);
  const scale = Math.max(getScale(sa), getScale(sb));
  const aBig = toBigInt(sa, scale);
  const bBig = toBigInt(sb, scale);
  return fromBigInt(aBig + bBig, scale);
}

export function subtract(a: string, b: string): string {
  const sa = sanitize(a);
  const sb = sanitize(b);
  const scale = Math.max(getScale(sa), getScale(sb));
  const aBig = toBigInt(sa, scale);
  const bBig = toBigInt(sb, scale);
  const result = aBig - bBig;
  if (result < 0n) return "0";
  return fromBigInt(result, scale);
}

export function max(a: string, b: string): string {
  const sa = sanitize(a);
  const sb = sanitize(b);
  const scale = Math.max(getScale(sa), getScale(sb));
  const aBig = toBigInt(sa, scale);
  const bBig = toBigInt(sb, scale);
  return fromBigInt(aBig >= bBig ? aBig : bBig, scale);
}

export function isPositive(a: string): boolean {
  const sa = sanitize(a);
  const scale = getScale(sa);
  const big = toBigInt(sa, scale);
  return big > 0n;
}

export function isGreaterThanOrEqual(a: string, b: string): boolean {
  const sa = sanitize(a);
  const sb = sanitize(b);
  const scale = Math.max(getScale(sa), getScale(sb));
  return toBigInt(sa, scale) >= toBigInt(sb, scale);
}

export function toFixed(a: string, decimals: number): string {
  const sa = sanitize(a);
  const currentScale = getScale(sa);
  const targetScale = decimals;
  const big = toBigInt(sa, currentScale);
  const adjusted = currentScale > targetScale
    ? big / BigInt(10 ** (currentScale - targetScale))
    : big * BigInt(10 ** (targetScale - currentScale));
  return fromBigInt(adjusted, targetScale);
}

function getScale(s: string): number {
  const dotIndex = s.indexOf(".");
  if (dotIndex === -1) return 0;
  return s.length - dotIndex - 1;
}

function toBigInt(s: string, scale: number): bigint {
  const parts = s.replace("-", "").split(".");
  const integer = parts[0] || "0";
  const fraction = (parts[1] || "").padEnd(scale, "0").slice(0, scale);
  const combined = integer + fraction;
  return BigInt(combined);
}

function fromBigInt(n: bigint, scale: number): string {
  if (scale === 0) return n.toString();
  const str = n.toString().padStart(scale + 1, "0");
  const integerPart = str.slice(0, -scale) || "0";
  const fractionPart = str.slice(-scale);
  return `${integerPart}.${fractionPart}`;
}
