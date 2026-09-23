"use client";

import { formatCep } from "@/utils";
import { Search, Save } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AddressForm, HandleAddAddress } from "@/components/profile/addresses";
import { AddressMap } from "@/components/address-map";
import type {
  CoordinateSource,
  SourcedCoords,
} from "@/lib/address-coordinates";
import { Coords } from "@/types/restaurant";
import { toast } from "sonner";

type Props = {
  handleCloseAddressModal: () => void;
  handleAddAddress: HandleAddAddress;
  applyCoords: (coords: Coords | null, source: CoordinateSource) => void;
  addressForm: AddressForm;
  addressCoords: SourcedCoords | null;
  isSavingAddress: boolean;
  isLoadingCep: boolean;
  isEditing?: boolean;
};

export function DeliveryForm({
  handleCloseAddressModal,
  handleAddAddress,
  applyCoords,
  addressForm,
  addressCoords,
  isSavingAddress,
  isLoadingCep,
  isEditing = false,
}: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && handleCloseAddressModal()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Endereço" : "Adicionar Novo Endereço"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={addressForm.handleSubmit(handleAddAddress, (errors) => {
            const firstError = Object.values(errors)[0];
            toast.error(
              firstError?.message ||
                "Verifique os campos obrigatórios do endereço",
            );
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CEP */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">CEP *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...addressForm.register("zipCode")}
                  placeholder="00000-000"
                  maxLength={9}
                  className="pl-10"
                  onChange={(e) => {
                    const formatted = formatCep(e.target.value);
                    addressForm.setValue("zipCode", formatted, {
                      shouldValidate: true,
                    });
                  }}
                  disabled={isLoadingCep}
                />
                {isLoadingCep && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {addressForm.formState.errors.zipCode && (
                <p className="text-sm text-destructive">
                  {addressForm.formState.errors.zipCode.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Digite o CEP e os campos serão preenchidos automaticamente
              </p>
            </div>

            {/* Rua */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Rua *</label>
              <Input
                {...addressForm.register("street")}
                placeholder="Nome da rua"
              />
              {addressForm.formState.errors.street && (
                <p className="text-sm text-destructive">
                  {addressForm.formState.errors.street.message}
                </p>
              )}
            </div>

            {/* Número */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Número *</label>
              <Input {...addressForm.register("number")} placeholder="123" />
              {addressForm.formState.errors.number && (
                <p className="text-sm text-destructive">
                  {addressForm.formState.errors.number.message}
                </p>
              )}
            </div>

            {/* Complemento */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Complemento</label>
              <Input
                {...addressForm.register("complement")}
                placeholder="Apto, bloco, etc"
              />
            </div>

            {/* Bairro */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bairro *</label>
              <Input
                {...addressForm.register("neighborhood")}
                placeholder="Nome do bairro"
              />
              {addressForm.formState.errors.neighborhood && (
                <p className="text-sm text-destructive">
                  {addressForm.formState.errors.neighborhood.message}
                </p>
              )}
            </div>

            {/* Cidade */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade *</label>
              <Input
                {...addressForm.register("city")}
                placeholder="Nome da cidade"
              />
              {addressForm.formState.errors.city && (
                <p className="text-sm text-destructive">
                  {addressForm.formState.errors.city.message}
                </p>
              )}
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado *</label>
              <Input
                {...addressForm.register("state")}
                placeholder="SP"
                maxLength={2}
              />
              {addressForm.formState.errors.state && (
                <p className="text-sm text-destructive">
                  {addressForm.formState.errors.state.message}
                </p>
              )}
            </div>

            {/* Localização no mapa */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">
                  Localização no mapa
                </label>
                <span className="text-xs text-muted-foreground">
                  {addressCoords
                    ? "Clique no mapa para ajustar"
                    : "Preencha o CEP ou clique no mapa"}
                </span>
              </div>
              <AddressMap
                mapHeight={220}
                value={addressCoords?.coords ?? null}
                onSelect={(coords) => applyCoords(coords, "manual")}
              />
              <p className="text-xs text-muted-foreground">
                Sem ajuste no mapa, localizamos o endereço automaticamente ao
                salvar.
              </p>
            </div>

            {/* Checkbox Padrão */}
            <div className="md:col-span-2 flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="isDefault"
                {...addressForm.register("isDefault")}
                className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
              />
              <label
                htmlFor="isDefault"
                className="text-sm font-medium cursor-pointer"
              >
                Definir como endereço padrão
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseAddressModal}
              disabled={isSavingAddress}
            >
              Cancelar
            </Button>
            <GradientButton
              type="submit"
              isLoading={isSavingAddress}
              loadingText={isEditing ? "Atualizando..." : "Salvando..."}
              disabled={isSavingAddress}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Atualizar Endereço" : "Salvar Endereço"}
            </GradientButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
