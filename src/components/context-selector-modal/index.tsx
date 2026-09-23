"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { sessionStorageAdapter } from "@/utils/storage-manager";
import { Building2, ShoppingBag, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface ContextSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export default function ContextSelectorModal({
  isOpen,
  onClose,
  userName,
}: ContextSelectorModalProps) {
  const router = useRouter();

  const handleSelectContext = (context: "restaurant" | "customer") => {
    // Usar sessionStorage para contexto temporário da sessão
    sessionStorageAdapter.setItem("userContext", context);
    if (context === "restaurant") {
      // Redirect to restaurant management
      router.push("/menu-management");
    } else {
      // Redirect to home as customer
      router.push("/");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <DialogTitle className="sr-only">Seleção de Contexto</DialogTitle>
        <div className="bg-gradient-to-r from-brand-500 to-brand-500 p-6 text-white rounded-t-lg">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Bem-vindo, {userName}!</h2>
              <p className="text-brand-100">
                Como você gostaria de acessar a plataforma?
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Restaurant option */}
            <Card
              className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-brand-500 group"
              onClick={() => handleSelectContext("restaurant")}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-brand-100 to-brand-100 flex items-center justify-center group-hover:from-brand-500 group-hover:to-brand-500 transition-all">
                  <Building2 className="h-8 w-8 text-brand-600 dark:text-brand-400 group-hover:text-white transition-all" />
                </div>
                <CardTitle className="text-xl">Gestor de Restaurante</CardTitle>
                <CardDescription className="text-sm">
                  Gerencie cardápio, pedidos e configurações
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <Button
                  className="w-full bg-gradient-to-r from-brand-500 to-brand-500 hover:from-brand-600 hover:to-brand-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectContext("restaurant");
                  }}
                >
                  Acessar Gestão
                </Button>
                <div className="mt-3 text-xs text-muted-foreground">
                  • Cadastrar pratos
                  <br />
                  • Visualizar pedidos
                  <br />• Relatórios financeiros
                </div>
              </CardContent>
            </Card>

            {/* Customer option */}
            <Card
              className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-brand-500 group"
              onClick={() => handleSelectContext("customer")}
            >
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center group-hover:bg-brand-500 transition-all">
                  <ShoppingBag className="h-8 w-8 text-brand-600 dark:text-brand-400 group-hover:text-white transition-all" />
                </div>
                <CardTitle className="text-xl">Cliente</CardTitle>
                <CardDescription className="text-sm">
                  Navegue, peça e acompanhe entregas
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <Button
                  className="w-full bg-brand-500 hover:bg-brand-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectContext("customer");
                  }}
                >
                  Acessar como Cliente
                </Button>
                <div className="mt-3 text-xs text-muted-foreground">
                  • Explorar restaurantes
                  <br />
                  • Fazer pedidos
                  <br />• Acompanhar entregas
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            💡 Você pode alternar entre os modos a qualquer momento
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
