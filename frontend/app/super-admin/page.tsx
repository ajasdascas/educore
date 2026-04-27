"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/super-admin/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Redirigiendo...</div>
    </div>
  );
}
