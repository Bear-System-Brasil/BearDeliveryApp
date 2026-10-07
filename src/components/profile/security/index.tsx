"use client";

import { Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { DataCard } from "@/components/data-card";
import { PASSWORD_CHANGE_UNAVAILABLE } from "@/constants/password-change";

export function Security() {
  return (
    <DataCard title="Segurança" icon={<Lock className="h-5 w-5" />}>
      <div className="space-y-4">
        {/* Sem rota de troca de senha no backend: o botão avisa em vez de
            não fazer nada (LDMF-299). */}
        <Button
          variant="outline"
          className="w-full justify-start rounded-xl border-border cursor-pointer"
          onClick={() => toast.error(PASSWORD_CHANGE_UNAVAILABLE)}
        >
          <Lock className="h-4 w-4 mr-2" />
          Alterar Senha
        </Button>
      </div>
    </DataCard>
  );
}
