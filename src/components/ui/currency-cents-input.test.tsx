import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyCentsInput } from "./currency-cents-input";

// Intl usa espaço não separável depois de "R$"; normaliza para comparar.
const text = (value: string) => value.replace(/ /g, " ");

const onChangeSpy = vi.fn();

function Controlled({
  initial,
  maskWhileTyping,
}: {
  initial?: number;
  maskWhileTyping?: boolean;
}) {
  const [value, setValue] = useState<number | undefined>(initial);
  return (
    <>
      <CurrencyCentsInput
        id="preco"
        value={value}
        maskWhileTyping={maskWhileTyping}
        onValueChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
      />
      <button type="button" onClick={() => setValue(undefined)}>
        zerar
      </button>
      <button type="button" onClick={() => setValue(42.9)}>
        carregar
      </button>
    </>
  );
}

const input = () => screen.getByRole("textbox") as HTMLInputElement;

describe("CurrencyCentsInput", () => {
  beforeEach(() => {
    onChangeSpy.mockClear();
  });

  it("cada dígito empurra os centavos: 1, 2, 3, 4 vira 12,34", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "1234");

    expect(input().value).toBe("12,34");
    expect(onChangeSpy).toHaveBeenLastCalledWith(12.34);
    expect(onChangeSpy.mock.calls.map(([v]) => v)).toEqual([0.01, 0.12, 1.23, 12.34]);
  });

  it("com máscara ligada, mostra R$ enquanto digita", async () => {
    const user = userEvent.setup();
    render(<Controlled maskWhileTyping />);

    await user.type(input(), "505");

    expect(text(input().value)).toBe("R$ 5,05");
    expect(onChangeSpy).toHaveBeenLastCalledWith(5.05);
  });

  it("ao sair do campo formata com R$, e ao voltar tira a máscara para editar", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "1990");
    await user.tab();
    expect(text(input().value)).toBe("R$ 19,90");

    await user.click(input());
    expect(input().value).toBe("19,90");
  });

  it("letras e símbolos são ignorados", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "1a,-5");

    expect(input().value).toBe("0,15");
    expect(onChangeSpy).toHaveBeenLastCalledWith(0.15);
  });

  it("para em 7 dígitos: o máximo é 99.999,99", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "123456789");

    expect(input().value).toBe("12345,67");
    expect(onChangeSpy).toHaveBeenLastCalledWith(12345.67);
  });

  it("colar um preço já formatado mantém o valor", async () => {
    const user = userEvent.setup();
    // Modo usado em todas as telas hoje (cardápio, adicionais, variações).
    render(<Controlled maskWhileTyping />);

    await user.click(input());
    await user.paste("R$ 12.345,67");

    expect(onChangeSpy).toHaveBeenLastCalledWith(12345.67);
  });

  it("colar mais de 7 dígitos corta nos 7 primeiros", async () => {
    const user = userEvent.setup();
    render(<Controlled maskWhileTyping />);

    await user.click(input());
    await user.paste("123456789");

    expect(onChangeSpy).toHaveBeenLastCalledWith(12345.67);
  });

  it("apagar tudo devolve undefined para o formulário", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "15");
    await user.clear(input());

    expect(input().value).toBe("");
    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);
  });

  it("só zeros contam como sem valor", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "00");

    expect(input().value).toBe("0,00");
    expect(onChangeSpy).toHaveBeenLastCalledWith(undefined);

    await user.tab();
    expect(input().value).toBe("");
  });

  it("valor vindo do formulário aparece formatado", () => {
    render(<Controlled initial={1234.5} />);

    expect(text(input().value)).toBe("R$ 1.234,50");
  });

  it("formulário zerado depois de salvar limpa o campo", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "999");
    await user.click(screen.getByRole("button", { name: "zerar" }));

    expect(input().value).toBe("");
  });

  it("formulário carregando outro registro troca o texto", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "100");
    await user.click(screen.getByRole("button", { name: "carregar" }));

    expect(text(input().value)).toBe("R$ 42,90");
  });

  it("digitar não reformata o texto no meio da edição", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    // O pai recebe o número e devolve como prop; o campo não pode trocar
    // "0,05" por "R$ 0,05" a cada tecla.
    await user.type(input(), "5");

    expect(input().value).toBe("0,05");
  });
});
