import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import * as React from "react";

export interface AddressFormData {
  zipCode: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement?: string;
  reference?: string;
}

export interface AddressFormFieldsProps {
  /**
   * Address form data
   */
  data: AddressFormData;

  /**
   * Callback when any field changes
   */
  onChange: (field: keyof AddressFormData, value: string) => void;

  /**
   * Whether fields are disabled
   */
  disabled?: boolean;

  /**
   * Show save checkbox
   */
  showSaveCheckbox?: boolean;

  /**
   * Save checkbox state
   */
  saveChecked?: boolean;

  /**
   * Callback when save checkbox changes
   */
  onSaveChange?: (checked: boolean) => void;

  /**
   * Custom className for the grid container
   */
  className?: string;

  /**
   * Required fields (defaults to all except complement and reference)
   */
  requiredFields?: (keyof AddressFormData)[];
}

const defaultRequiredFields: (keyof AddressFormData)[] = [
  "zipCode",
  "state",
  "city",
  "neighborhood",
  "street",
  "number",
];

/**
 * AddressFormFields - Reusable address form fields component
 *
 * This component provides a consistent set of address input fields used across
 * checkout, profile, and company profile pages. It includes CEP, street, number,
 * city, state, neighborhood, complement, and reference fields.
 *
 * @example
 * ```tsx
 * const [address, setAddress] = useState<AddressFormData>({
 *   zipCode: '',
 *   state: '',
 *   city: '',
 *   neighborhood: '',
 *   street: '',
 *   number: '',
 *   complement: '',
 *   reference: ''
 * })
 *
 * <AddressFormFields
 *   data={address}
 *   onChange={(field, value) => setAddress(prev => ({ ...prev, [field]: value }))}
 * />
 *
 * // With save checkbox
 * <AddressFormFields
 *   data={address}
 *   onChange={handleChange}
 *   showSaveCheckbox
 *   saveChecked={saveAddress}
 *   onSaveChange={setSaveAddress}
 * />
 * ```
 */
export const AddressFormFields = React.memo<AddressFormFieldsProps>(
  ({
    data,
    onChange,
    disabled = false,
    showSaveCheckbox = false,
    saveChecked = false,
    onSaveChange,
    className,
    requiredFields = defaultRequiredFields,
  }) => {
    const isRequired = React.useCallback(
      (field: keyof AddressFormData) => requiredFields.includes(field),
      [requiredFields],
    );

    return (
      <div className={cn("space-y-4", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CEP */}
          <div className="space-y-2">
            <Label
              htmlFor="zipCode"
              className="text-sm font-semibold text-foreground"
            >
              CEP {isRequired("zipCode") && "*"}
            </Label>
            <Input
              id="zipCode"
              type="text"
              placeholder="00000-000"
              value={data.zipCode}
              onChange={(e) => onChange("zipCode", e.target.value)}
              disabled={disabled}
              className="rounded-xl border-2 border-border focus:border-brand-400"
              maxLength={9}
            />
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label
              htmlFor="state"
              className="text-sm font-semibold text-foreground"
            >
              Estado {isRequired("state") && "*"}
            </Label>
            <Input
              id="state"
              type="text"
              placeholder="SP"
              value={data.state}
              onChange={(e) => onChange("state", e.target.value)}
              disabled={disabled}
              className="rounded-xl border-2 border-border focus:border-brand-400"
              maxLength={2}
            />
          </div>

          {/* Cidade */}
          <div className="space-y-2">
            <Label
              htmlFor="city"
              className="text-sm font-semibold text-foreground"
            >
              Cidade {isRequired("city") && "*"}
            </Label>
            <Input
              id="city"
              type="text"
              placeholder="São Paulo"
              value={data.city}
              onChange={(e) => onChange("city", e.target.value)}
              disabled={disabled}
              className="rounded-xl border-2 border-border focus:border-brand-400"
            />
          </div>

          {/* Bairro */}
          <div className="space-y-2">
            <Label
              htmlFor="neighborhood"
              className="text-sm font-semibold text-foreground"
            >
              Bairro {isRequired("neighborhood") && "*"}
            </Label>
            <Input
              id="neighborhood"
              type="text"
              placeholder="Centro"
              value={data.neighborhood}
              onChange={(e) => onChange("neighborhood", e.target.value)}
              disabled={disabled}
              className="rounded-xl border-2 border-border focus:border-brand-400"
            />
          </div>

          {/* Rua */}
          <div className="space-y-2">
            <Label
              htmlFor="street"
              className="text-sm font-semibold text-foreground"
            >
              Rua {isRequired("street") && "*"}
            </Label>
            <Input
              id="street"
              type="text"
              placeholder="Rua das Flores"
              value={data.street}
              onChange={(e) => onChange("street", e.target.value)}
              disabled={disabled}
              className="rounded-xl border-2 border-border focus:border-brand-400"
            />
          </div>

          {/* Número */}
          <div className="space-y-2">
            <Label
              htmlFor="number"
              className="text-sm font-semibold text-foreground"
            >
              Número {isRequired("number") && "*"}
            </Label>
            <Input
              id="number"
              type="text"
              placeholder="123"
              value={data.number}
              onChange={(e) => onChange("number", e.target.value)}
              disabled={disabled}
              className="rounded-xl border-2 border-border focus:border-brand-400"
            />
          </div>

          {/* Complemento */}
          <div className="space-y-2 md:col-span-2">
            <Label
              htmlFor="complement"
              className="text-sm font-semibold text-foreground"
            >
              Complemento {isRequired("complement") && "*"}
            </Label>
            <Input
              id="complement"
              type="text"
              placeholder="Apartamento, bloco, etc"
              value={data.complement || ""}
              onChange={(e) => onChange("complement", e.target.value)}
              disabled={disabled}
              className="rounded-xl border-2 border-border focus:border-brand-400"
            />
          </div>

          {/* Referência */}
          <div className="space-y-2 md:col-span-2">
            <Label
              htmlFor="reference"
              className="text-sm font-semibold text-foreground"
            >
              Ponto de Referência {isRequired("reference") && "*"}
            </Label>
            <Input
              id="reference"
              type="text"
              placeholder="Próximo ao mercado, em frente à praça..."
              value={data.reference || ""}
              onChange={(e) => onChange("reference", e.target.value)}
              disabled={disabled}
              className="rounded-xl border-2 border-border focus:border-brand-400"
            />
          </div>
        </div>

        {/* Save checkbox */}
        {showSaveCheckbox && onSaveChange && (
          <div className="pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveAddress"
                checked={saveChecked}
                onCheckedChange={(checked) => onSaveChange(checked as boolean)}
                disabled={disabled}
              />
              <Label
                htmlFor="saveAddress"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Salvar este endereço para pedidos futuros
              </Label>
            </div>
          </div>
        )}
      </div>
    );
  },
);

AddressFormFields.displayName = "AddressFormFields";

/**
 * Hook to manage address form state
 */
export const useAddressForm = (initialData?: Partial<AddressFormData>) => {
  const [data, setData] = React.useState<AddressFormData>({
    zipCode: "",
    state: "",
    city: "",
    neighborhood: "",
    street: "",
    number: "",
    complement: "",
    reference: "",
    ...initialData,
  });

  const handleChange = React.useCallback(
    (field: keyof AddressFormData, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const resetForm = React.useCallback(() => {
    setData({
      zipCode: "",
      state: "",
      city: "",
      neighborhood: "",
      street: "",
      number: "",
      complement: "",
      reference: "",
    });
  }, []);

  const setFormData = React.useCallback((newData: Partial<AddressFormData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  const isValid = React.useMemo(() => {
    return Boolean(
      data.zipCode &&
      data.state &&
      data.city &&
      data.neighborhood &&
      data.street &&
      data.number,
    );
  }, [data]);

  return {
    data,
    handleChange,
    resetForm,
    setFormData,
    isValid,
  };
};
