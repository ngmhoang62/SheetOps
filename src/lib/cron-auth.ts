import { timingSafeEqual } from "node:crypto";
export function validCronHeader(
  received: string | null,
  secret: string | undefined,
) {
  if (!secret || !received) return false;
  const a = Buffer.from(received),
    b = Buffer.from("Bearer " + secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
