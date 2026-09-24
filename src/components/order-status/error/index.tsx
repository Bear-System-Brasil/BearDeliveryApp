import { MainHeader } from "@/components/main-header";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  data: {
    totalItems: number;
    error: string | null;
  };
};

export function ErrorPage({ data }: Props) {
  const router = useRouter();

  return (
    <AnimatedBackground showBlobs={true} blobCount={2}>
      <MainHeader
        cartItems={data.totalItems}
        onCartClick={() => router.push("/cart")}
        showSearch={false}
        showNav={true}
      />
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">
            {data.error || "Pedido não encontrado"}
          </p>
          <Button
            onClick={() => router.push("/#lojas")}
            className="bg-linear-to-r from-brand-500 to-brand-500 hover:from-brand-600 hover:to-brand-600 cursor-pointer"
          >
            Voltar para Restaurantes
          </Button>
        </div>
      </div>
    </AnimatedBackground>
  );
}
