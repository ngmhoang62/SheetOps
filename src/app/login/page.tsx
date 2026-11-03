import { LoginPage } from "@/components/shell";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string | string[] }>;
}) {
  const { reason } = await searchParams;
  return <LoginPage reason={typeof reason === "string" ? reason : undefined} />;
}
