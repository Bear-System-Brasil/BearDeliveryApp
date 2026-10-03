import { fireEvent, render, screen } from "@testing-library/react";
import L from "leaflet";
import { afterEach, describe, expect, it, vi } from "vitest";

import LeafletAddressMap from "./leaflet-address-map";

const CASTELO = { lat: -20.6033, lng: -41.1847 };

function getMarker(container: HTMLElement) {
  return container.querySelector<HTMLElement>("img.leaflet-marker-icon");
}

describe("LeafletAddressMap", () => {
  it("mostra a atribuição do OpenStreetMap", () => {
    render(<LeafletAddressMap value={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("link", { name: "OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    expect(screen.getByText(/contributors/)).toBeInTheDocument();
  });

  it("não mostra pino sem coordenada e não chama onSelect no mount", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <LeafletAddressMap value={null} onSelect={onSelect} />,
    );

    expect(getMarker(container)).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("mostra o pino arrastável quando há coordenada", () => {
    const { container } = render(
      <LeafletAddressMap value={CASTELO} onSelect={vi.fn()} />,
    );

    const marker = getMarker(container);

    expect(marker).not.toBeNull();
    expect(marker).toHaveClass("leaflet-marker-draggable");
  });

  it("coordenada nova vinda de fora move o pino sem chamar onSelect", () => {
    const onSelect = vi.fn();
    const { container, rerender } = render(
      <LeafletAddressMap value={null} onSelect={onSelect} />,
    );

    rerender(<LeafletAddressMap value={CASTELO} onSelect={onSelect} />);

    expect(getMarker(container)).not.toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("toque no mapa devolve a coordenada tocada", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <LeafletAddressMap value={CASTELO} onSelect={onSelect} />,
    );

    const map = container.querySelector<HTMLElement>(".leaflet-container")!;
    fireEvent.click(map, { clientX: 10, clientY: 10 });

    expect(onSelect).toHaveBeenCalledTimes(1);

    const [coords] = onSelect.mock.calls[0];
    expect(Number.isFinite(coords.lat)).toBe(true);
    expect(Number.isFinite(coords.lng)).toBe(true);
  });

  it("arrastar o pino devolve a nova coordenada", async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <LeafletAddressMap value={CASTELO} onSelect={onSelect} />,
    );

    const marker = getMarker(container)!;

    // o Leaflet só aceita botão esquerdo (`which: 1`), e o alvo do
    // movimento precisa ser um elemento, como no navegador
    fireEvent.mouseDown(marker, { which: 1, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document.body, { which: 1, clientX: 160, clientY: 140 });
    // o Leaflet atualiza a posição do pino no próximo frame
    await new Promise((resolve) => setTimeout(resolve, 50));
    fireEvent.mouseUp(document.body, { which: 1, clientX: 160, clientY: 140 });

    expect(onSelect).toHaveBeenCalledTimes(1);

    const [coords] = onSelect.mock.calls[0];
    expect(coords.lat).not.toBeCloseTo(CASTELO.lat, 6);
    expect(coords.lng).not.toBeCloseTo(CASTELO.lng, 6);
  });

  describe("recentralizar", () => {
    afterEach(() => vi.restoreAllMocks());

    function lastView(spy: ReturnType<typeof vi.spyOn>) {
      const [center, zoom] = spy.mock.calls.at(-1) as [L.LatLngExpression, number];
      return { center: L.latLng(center), zoom };
    }

    it("posição nova recentraliza o mapa nela, com o zoom pedido", () => {
      const setView = vi.spyOn(L.Map.prototype, "setView");
      const { rerender } = render(
        <LeafletAddressMap value={CASTELO} zoom={13} recenterKey={1} onSelect={vi.fn()} />,
      );

      rerender(
        <LeafletAddressMap
          value={{ lat: -20.62, lng: -41.21 }}
          zoom={17}
          recenterKey={2}
          onSelect={vi.fn()}
        />,
      );

      const view = lastView(setView);
      expect(view.center.lat).toBeCloseTo(-20.62, 6);
      expect(view.center.lng).toBeCloseTo(-41.21, 6);
      expect(view.zoom).toBe(17);
    });

    it("mesma posição com novo recenterKey recentraliza de novo", () => {
      const setView = vi.spyOn(L.Map.prototype, "setView");
      const { rerender } = render(
        <LeafletAddressMap value={CASTELO} zoom={13} recenterKey={1} onSelect={vi.fn()} />,
      );
      const calls = setView.mock.calls.length;

      rerender(
        <LeafletAddressMap value={CASTELO} zoom={13} recenterKey={2} onSelect={vi.fn()} />,
      );

      expect(setView.mock.calls.length).toBeGreaterThan(calls);
      expect(lastView(setView).center.lat).toBeCloseTo(CASTELO.lat, 6);
    });

    it("sem zoom pedido, mantém o zoom atual do mapa", () => {
      const setView = vi.spyOn(L.Map.prototype, "setView");
      const { rerender } = render(
        <LeafletAddressMap value={CASTELO} zoom={15} recenterKey={1} onSelect={vi.fn()} />,
      );

      rerender(
        <LeafletAddressMap value={{ lat: -20.61, lng: -41.2 }} recenterKey={2} onSelect={vi.fn()} />,
      );

      expect(lastView(setView).zoom).toBe(15);
    });
  });
});
