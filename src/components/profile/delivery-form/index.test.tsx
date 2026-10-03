import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAddressFields } from "@/hooks/use-address-fields";
import { useAddressForm } from "@/hooks/use-form-validation";

import { DeliveryForm } from "./index";

vi.mock("@/components/address-map", () => ({
  AddressMap: () => <div data-testid="mapa" />,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const IBGE: Record<string, unknown> = {
  "/estados?orderBy=nome": [
    { id: 32, sigla: "ES", nome: "Espírito Santo" },
    { id: 31, sigla: "MG", nome: "Minas Gerais" },
  ],
  "/estados/ES/municipios?orderBy=nome": [
    { id: 3200201, nome: "Alegre" },
    { id: 3201407, nome: "Castelo" },
  ],
  "/estados/MG/municipios?orderBy=nome": [{ id: 3106200, nome: "Belo Horizonte" }],
};

const onPreviousFieldChange = vi.fn();

function Harness(extra: { isSearchingAddress?: boolean; addressNotFound?: boolean }) {
  const form = useAddressForm();
  const fields = useAddressFields({ form, enabled: true, onPreviousFieldChange });
  const city = form.watch("city");

  return (
    <>
      <output data-testid="valor-bairro">{form.watch("neighborhood")}</output>
      <DeliveryForm
        handleCloseAddressModal={vi.fn()}
        handleAddAddress={vi.fn()}
        applyCoords={vi.fn()}
        addressForm={form}
        addressCoords={null}
        isSavingAddress={false}
        isLoadingCep={false}
        neighborhoodOptions={
          city === "Castelo"
            ? [
                { value: "Centro", label: "Centro" },
                { value: "Castelo III", label: "Castelo III (Pombal, Ivo Martins)" },
              ]
            : null
        }
        stateOptions={fields.stateOptions}
        cityOptions={fields.cityOptions}
        isLoadingCities={fields.isLoadingCities}
        citiesError={fields.citiesError}
        fieldLocks={fields.locks}
        onStateChange={fields.changeState}
        onCityChange={fields.changeCity}
        onNeighborhoodChange={fields.changeNeighborhood}
        {...extra}
      />
    </>
  );
}

function renderForm(extra: { isSearchingAddress?: boolean; addressNotFound?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness {...extra} />
    </QueryClientProvider>,
  );
}

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;

async function pickState(uf: string) {
  await waitFor(() => expect(screen.getByRole("option", { name: "Espírito Santo" })).toBeTruthy());
  fireEvent.change(field(/Estado/), { target: { value: uf } });
}

async function pickCity(name: string) {
  await waitFor(() => expect(screen.getByRole("option", { name })).toBeTruthy());
  fireEvent.change(field(/Cidade/), { target: { value: name } });
}

async function fillUntilNumber() {
  await pickState("ES");
  await pickCity("Castelo");
  fireEvent.change(field(/Bairro/), { target: { value: "Centro" } });
  fireEvent.change(field(/Rua/), { target: { value: "Rua Principal" } });
  fireEvent.change(field(/Número/), { target: { value: "45" } });
  await waitFor(() => expect(field(/Complemento/).disabled).toBe(false));
}

describe("DeliveryForm: ordem e trava dos campos", () => {
  beforeEach(() => {
    onPreviousFieldChange.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () => IBGE[url.replace("https://servicodados.ibge.gov.br/api/v1/localidades", "")] ?? [],
      })),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("campos na ordem CEP → Estado → Cidade → Bairro → Rua → Número → Complemento → Mapa", () => {
    renderForm();

    const order = [/CEP/, /Estado/, /Cidade/, /Bairro/, /Rua/, /Número/, /Complemento/].map(
      (label) => field(label),
    );
    const mapa = screen.getByTestId("mapa");

    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(
      order[order.length - 1].compareDocumentPosition(mapa) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("CEP e Estado abrem liberados; o resto fica travado", () => {
    renderForm();

    expect(field(/CEP/).disabled).toBe(false);
    expect(field(/Estado/).disabled).toBe(false);
    for (const label of [/Cidade/, /Bairro/, /Rua/, /Número/, /Complemento/]) {
      expect(field(label).disabled).toBe(true);
    }
  });

  it("estado e cidade vêm do IBGE e cada campo libera o seguinte", async () => {
    renderForm();

    await pickState("ES");
    expect(field(/Cidade/).disabled).toBe(false);
    expect(field(/Bairro/).disabled).toBe(true);

    await pickCity("Castelo");
    expect(field(/Bairro/).disabled).toBe(false);
    expect(field(/Bairro/).tagName).toBe("SELECT");
    expect(field(/Rua/).disabled).toBe(true);

    fireEvent.change(field(/Bairro/), { target: { value: "Centro" } });
    expect(field(/Rua/).disabled).toBe(false);
    expect(field(/Número/).disabled).toBe(true);

    fireEvent.change(field(/Rua/), { target: { value: "Rua Principal" } });
    await waitFor(() => expect(field(/Número/).disabled).toBe(false));
    expect(field(/Complemento/).disabled).toBe(true);

    fireEvent.change(field(/Número/), { target: { value: "45" } });
    await waitFor(() => expect(field(/Complemento/).disabled).toBe(false));
  });

  it("opção mostra os outros nomes entre parênteses e salva só o nome oficial", async () => {
    renderForm();
    await pickState("ES");
    await pickCity("Castelo");

    const option = screen.getByRole("option", { name: "Castelo III (Pombal, Ivo Martins)" });
    expect(option).toHaveValue("Castelo III");

    fireEvent.change(field(/Bairro/), { target: { value: "Castelo III" } });

    expect(screen.getByTestId("valor-bairro")).toHaveTextContent(/^Castelo III$/);
  });

  it("trocar a cidade limpa bairro, rua e número e avisa para limpar o pino", async () => {
    renderForm();
    await fillUntilNumber();
    onPreviousFieldChange.mockClear();

    await pickCity("Alegre");

    expect(field(/Cidade/).value).toBe("Alegre");
    expect(field(/Bairro/).value).toBe("");
    expect(field(/Rua/).value).toBe("");
    expect(field(/Número/).value).toBe("");
    expect(field(/Rua/).disabled).toBe(true);
    expect(onPreviousFieldChange).toHaveBeenCalledTimes(1);
  });

  it("trocar o estado limpa também a cidade", async () => {
    renderForm();
    await fillUntilNumber();
    onPreviousFieldChange.mockClear();

    fireEvent.change(field(/Estado/), { target: { value: "MG" } });

    expect(field(/Cidade/).value).toBe("");
    expect(field(/Bairro/).value).toBe("");
    expect(field(/Bairro/).disabled).toBe(true);
    expect(onPreviousFieldChange).toHaveBeenCalledTimes(1);
  });

  it("trocar o bairro limpa rua e número", async () => {
    renderForm();
    await fillUntilNumber();
    onPreviousFieldChange.mockClear();

    fireEvent.change(field(/Bairro/), { target: { value: "Castelo III" } });

    expect(field(/Rua/).value).toBe("");
    expect(field(/Número/).value).toBe("");
    expect(onPreviousFieldChange).toHaveBeenCalledTimes(1);
  });

  it("escolher o mesmo valor de novo não limpa nada", async () => {
    renderForm();
    await fillUntilNumber();
    onPreviousFieldChange.mockClear();

    fireEvent.change(field(/Cidade/), { target: { value: "Castelo" } });

    expect(field(/Rua/).value).toBe("Rua Principal");
    expect(onPreviousFieldChange).not.toHaveBeenCalled();
  });

  it("sem resposta do IBGE, estados vêm da lista fixa e a cidade vira campo livre", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => [] })));
    renderForm();

    // O hook tenta o IBGE de novo uma vez antes de desistir.
    await waitFor(() => expect(screen.getByRole("option", { name: "Espírito Santo" })).toBeTruthy(), {
      timeout: 4000,
    });
    fireEvent.change(field(/Estado/), { target: { value: "ES" } });

    await waitFor(() => expect(field(/Cidade/).tagName).toBe("INPUT"), { timeout: 4000 });
    expect(field(/Cidade/).disabled).toBe(false);
  });

  it("mostra 'Buscando endereço...' durante a busca", () => {
    renderForm({ isSearchingAddress: true });

    expect(screen.getByRole("status")).toHaveTextContent("Buscando endereço...");
  });

  it("avisa quando o endereço não foi encontrado no mapa", () => {
    renderForm({ addressNotFound: true });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não encontramos esse endereço no mapa. Arraste o pino até a sua casa.",
    );
  });

  it("sem busca e sem aviso, nenhuma das mensagens aparece", () => {
    renderForm();

    expect(screen.queryByText("Buscando endereço...")).toBeNull();
    expect(screen.queryByText(/Não encontramos esse endereço/)).toBeNull();
  });
});
