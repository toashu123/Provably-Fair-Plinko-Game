"use client";
import { useSearchParams } from "next/navigation";
import VerifierForm from "@/components/VerifierForm";

/**
 * Client wrapper that reads URL search params and passes them to VerifierForm.
 * This is needed because useSearchParams() requires a client component,
 * but we want the parent page.tsx to remain a Server Component.
 */
export default function VerifierFormWrapper() {
  const params = useSearchParams();

  return (
    <VerifierForm
      initialServerSeed={params.get("serverSeed") ?? ""}
      initialClientSeed={params.get("clientSeed") ?? ""}
      initialNonce={params.get("nonce") ?? ""}
      initialDropColumn={params.get("dropColumn") ?? "6"}
    />
  );
}
