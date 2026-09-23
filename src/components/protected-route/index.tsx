"use client";

import { useAuth } from "@/contexts/auth-provider";
import { useAuthStore } from "@/stores";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  fallbackPath = "/unauthorized",
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  // O Zustand persist hidrata a sessão do localStorage de forma assíncrona -
  // isAuthenticated começa em `false` até isso terminar, mesmo pra quem tá
  // logado. Sem esperar `_hasHydrated`, todo F5 numa rota protegida mandava
  // o usuário de volta pro login e abria o modal por engano.
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;

    // Check authentication
    if (!isAuthenticated) {
      router.push("/?openAuth=true");
      setIsChecking(false);
      return;
    }

    // Check role
    if (user && !allowedRoles.includes(user.role)) {
      router.push(fallbackPath);
      setIsChecking(false);
      return;
    }

    setIsChecking(false);
  }, [hasHydrated, isAuthenticated, user, allowedRoles, router, fallbackPath]);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
