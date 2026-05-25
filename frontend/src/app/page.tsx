"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionRole } from "@/lib/auth/session";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const role = getSessionRole();
    if (!role) {
      router.replace("/login");
      return;
    }

    router.replace(role === "ADMIN" ? "/admin" : "/portal");
  }, [router]);

  return null;
}
