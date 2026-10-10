import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCourierPositionStore } from "@/stores/courier-position-store";
import { LocationDialog } from "./location-dialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/**
 * PermissionStatus falso: mesma instância a vida toda (referência estável),
 * com `change` disparável pelo teste.
 */
const permissionStatus = {
  state: "prompt" as PermissionState,
  listeners: new Set<() => void>(),
  addEventListener: (_: string, fn: () => void) => permissionStatus.listeners.add(fn),
  removeEventListener: (_: string, fn: () => void) => permissionStatus.listeners.delete(fn),
};
const query = vi.fn(async () => permissionStatus);

function setPermission(state: PermissionState) {
  permissionStatus.state = state;
  permissionStatus.listeners.forEach((fn) => fn());
}

const onClose = vi.fn();
const onConfirmed = vi.fn();

function renderDialog(failure: "denied" | "timeout" | null) {
  return render(
    <LocationDialog
      open
      purpose="accept"
      failure={failure}
      onClose={onClose}
      onConfirmed={onConfirmed}
    />,
  );
}

const gpsButton = () => screen.getByRole("button", { name: /GPS/ });
const unblockHelp = () => screen.queryByText(/Para liberar:/);

describe("LocationDialog - localização bloqueada (LDMF-314)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionStatus.state = "prompt";
    permissionStatus.listeners.clear();
    useCourierPositionStore.setState({ position: null });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
  });

  it("com a permissão negada, explica como liberar e trava o botão do GPS", async () => {
    permissionStatus.state = "denied";
    renderDialog("denied");

    await waitFor(() => expect(gpsButton()).toBeDisabled());
    expect(gpsButton()).toHaveTextContent("GPS bloqueado neste aparelho");
    expect(unblockHelp()).toBeInTheDocument();
  });

  it("liberar nas configurações reabilita o GPS sem fechar o diálogo", async () => {
    permissionStatus.state = "denied";
    renderDialog("denied");
    await waitFor(() => expect(gpsButton()).toBeDisabled());

    act(() => setPermission("granted"));

    await waitFor(() => expect(gpsButton()).toBeEnabled());
    expect(gpsButton()).toHaveTextContent("Tentar pelo GPS");
    expect(unblockHelp()).not.toBeInTheDocument();
  });

  it("sem a Permissions API, a falha 'denied' ainda mostra como liberar, sem travar o botão", async () => {
    Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
    renderDialog("denied");

    expect(unblockHelp()).toBeInTheDocument();
    expect(gpsButton()).toBeEnabled();
  });

  it("GPS que só demorou não mostra instrução de liberar", async () => {
    renderDialog("timeout");

    await waitFor(() => expect(query).toHaveBeenCalled());
    expect(screen.getByText("O GPS demorou demais pra responder.")).toBeInTheDocument();
    expect(unblockHelp()).not.toBeInTheDocument();
    expect(gpsButton()).toBeEnabled();
  });
});
