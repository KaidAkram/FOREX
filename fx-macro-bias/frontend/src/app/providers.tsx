"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LiveDataProvider } from "@/context/LiveDataContext";
import { useState } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}><LiveDataProvider>{children}</LiveDataProvider></QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
