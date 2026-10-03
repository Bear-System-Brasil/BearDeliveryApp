import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LeafletDeliveringMap from "./leaflet-delivering-map";

describe("LeafletDeliveringMap", () => {
  it("mostra o marcador do entregador e a atribuição do OpenStreetMap", () => {
    const { container } = render(
      <LeafletDeliveringMap lat={-20.6033} lng={-41.1847} />,
    );

    expect(container.querySelector("img.leaflet-marker-icon")).not.toBeNull();
    expect(screen.getByRole("link", { name: "OpenStreetMap" })).toBeInTheDocument();
  });

  it("não tem controles nem arrasto, como o mapa antigo", () => {
    const { container } = render(
      <LeafletDeliveringMap lat={-20.6033} lng={-41.1847} />,
    );

    expect(container.querySelector(".leaflet-control-zoom")).toBeNull();
    expect(container.querySelector(".leaflet-grab")).toBeNull();
    expect(container.querySelector(".leaflet-marker-draggable")).toBeNull();
  });
});
