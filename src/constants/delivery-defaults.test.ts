import { describe, expect, it } from "vitest";

import {
  DEFAULT_DELIVERY_FEE,
  DEFAULT_DELIVERY_TIME,
  withDeliveryDefaults,
} from "./delivery-defaults";

describe("withDeliveryDefaults", () => {
  it("preenche frete e tempo quando a API não manda", () => {
    expect(withDeliveryDefaults({})).toEqual({
      deliveryFee: DEFAULT_DELIVERY_FEE,
      time: DEFAULT_DELIVERY_TIME,
    });
    expect(withDeliveryDefaults({ deliveryFee: "", time: null })).toEqual({
      deliveryFee: DEFAULT_DELIVERY_FEE,
      time: DEFAULT_DELIVERY_TIME,
    });
  });

  it("respeita o que veio da API, inclusive frete zero (grátis)", () => {
    expect(withDeliveryDefaults({ deliveryFee: 0, time: "20-30 min" })).toEqual(
      { deliveryFee: 0, time: "20-30 min" },
    );
    expect(withDeliveryDefaults({ deliveryFee: "6.9" }).deliveryFee).toBe(
      "6.9",
    );
  });
});
