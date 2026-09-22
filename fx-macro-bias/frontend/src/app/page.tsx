"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user?.role === "admin") {
        router.replace("/admin/dashboard");
      } else if (user?.role === "user") {
        router.replace("/portal");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#D2F646] border-t-transparent animate-spin" />
    </div>
  );
}
