import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PaymentMethod } from "@/services/api";
import { useFinancialPreferencesStore } from "./financial-preferences-store";

const initialState = useFinancialPreferencesStore.getState();

describe("useFinancialPreferencesStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useFinancialPreferencesStore.setState(initialState, true);
  });

  it("começa com CASH e confirmação de fechamento de caixa ativada", () => {
    const state = useFinancialPreferencesStore.getState();
    expect(state.defaultPaymentMethod).toBe(PaymentMethod.CASH);
    expect(state.confirmBeforeCloseRegister).toBe(true);
  });

  it("setDefaultPaymentMethod troca o método pré-selecionado", () => {
    act(() =>
      useFinancialPreferencesStore.getState().setDefaultPaymentMethod(PaymentMethod.PIX),
    );
    expect(useFinancialPreferencesStore.getState().defaultPaymentMethod).toBe(
      PaymentMethod.PIX,
    );
  });

  it("setConfirmBeforeCloseRegister liga/desliga a confirmação extra", () => {
    act(() =>
      useFinancialPreferencesStore.getState().setConfirmBeforeCloseRegister(false),
    );
    expect(useFinancialPreferencesStore.getState().confirmBeforeCloseRegister).toBe(false);
  });

  it("resetFinancialPreferences restaura os defaults", () => {
    act(() => {
      useFinancialPreferencesStore.getState().setDefaultPaymentMethod(PaymentMethod.PIX);
      useFinancialPreferencesStore.getState().setConfirmBeforeCloseRegister(false);
      useFinancialPreferencesStore.getState().resetFinancialPreferences();
    });

    const state = useFinancialPreferencesStore.getState();
    expect(state.defaultPaymentMethod).toBe(PaymentMethod.CASH);
    expect(state.confirmBeforeCloseRegister).toBe(true);
  });

  it("persiste a escolha no localStorage", () => {
    act(() =>
      useFinancialPreferencesStore.getState().setDefaultPaymentMethod(PaymentMethod.DEBIT_CARD),
    );

    const persisted = JSON.parse(
      localStorage.getItem("financial-preferences") ?? "{}",
    );
    expect(persisted.state.defaultPaymentMethod).toBe(PaymentMethod.DEBIT_CARD);
  });
});
