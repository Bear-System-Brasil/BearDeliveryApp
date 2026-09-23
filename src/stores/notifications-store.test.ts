import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useNotificationsStore } from "./notifications-store";

const initialState = useNotificationsStore.getState();

describe("useNotificationsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useNotificationsStore.setState(initialState, true);
  });

  it("começa sem notificações", () => {
    expect(useNotificationsStore.getState().items).toEqual([]);
  });

  it("addNotification insere no topo da lista, gera id/createdAt e começa como não lida", () => {
    act(() =>
      useNotificationsStore.getState().addNotification({
        audience: "customer",
        title: "Pedido confirmado",
        body: "Seu pedido foi confirmado",
      }),
    );

    const [item] = useNotificationsStore.getState().items;
    expect(item.title).toBe("Pedido confirmado");
    expect(item.read).toBe(false);
    expect(item.id).toBeTruthy();
    expect(new Date(item.createdAt).toString()).not.toBe("Invalid Date");
  });

  it("notificações novas entram sempre na frente (mais recente primeiro)", () => {
    act(() => {
      useNotificationsStore.getState().addNotification({
        audience: "customer",
        title: "Primeira",
        body: "...",
      });
      useNotificationsStore.getState().addNotification({
        audience: "customer",
        title: "Segunda",
        body: "...",
      });
    });

    const items = useNotificationsStore.getState().items;
    expect(items.map((i) => i.title)).toEqual(["Segunda", "Primeira"]);
  });

  it("mantém no máximo 50 notificações, descartando as mais antigas", () => {
    act(() => {
      for (let i = 0; i < 55; i++) {
        useNotificationsStore.getState().addNotification({
          audience: "management",
          title: `Notificação ${i}`,
          body: "...",
        });
      }
    });

    const items = useNotificationsStore.getState().items;
    expect(items).toHaveLength(50);
    // as 5 primeiras (mais antigas) devem ter sido descartadas
    expect(items[items.length - 1].title).toBe("Notificação 5");
    expect(items[0].title).toBe("Notificação 54");
  });

  it("markAsRead marca só a notificação com o id indicado", () => {
    act(() => {
      useNotificationsStore.getState().addNotification({
        audience: "customer",
        title: "A",
        body: "...",
      });
      useNotificationsStore.getState().addNotification({
        audience: "customer",
        title: "B",
        body: "...",
      });
    });

    const [unreadTarget] = useNotificationsStore.getState().items;
    act(() => useNotificationsStore.getState().markAsRead(unreadTarget.id));

    const items = useNotificationsStore.getState().items;
    expect(items.find((i) => i.id === unreadTarget.id)?.read).toBe(true);
    expect(items.filter((i) => i.read)).toHaveLength(1);
  });

  it("markAllAsRead sem audiência marca tudo", () => {
    act(() => {
      useNotificationsStore.getState().addNotification({ audience: "customer", title: "A", body: "" });
      useNotificationsStore.getState().addNotification({ audience: "management", title: "B", body: "" });
      useNotificationsStore.getState().markAllAsRead();
    });

    expect(useNotificationsStore.getState().items.every((i) => i.read)).toBe(true);
  });

  it("markAllAsRead com audiência só afeta aquela audiência", () => {
    act(() => {
      useNotificationsStore.getState().addNotification({ audience: "customer", title: "A", body: "" });
      useNotificationsStore.getState().addNotification({ audience: "management", title: "B", body: "" });
      useNotificationsStore.getState().markAllAsRead("customer");
    });

    const items = useNotificationsStore.getState().items;
    expect(items.find((i) => i.audience === "customer")?.read).toBe(true);
    expect(items.find((i) => i.audience === "management")?.read).toBe(false);
  });

  it("clearAll sem audiência remove tudo", () => {
    act(() => {
      useNotificationsStore.getState().addNotification({ audience: "customer", title: "A", body: "" });
      useNotificationsStore.getState().clearAll();
    });

    expect(useNotificationsStore.getState().items).toEqual([]);
  });

  it("clearAll com audiência remove só daquela audiência", () => {
    act(() => {
      useNotificationsStore.getState().addNotification({ audience: "customer", title: "A", body: "" });
      useNotificationsStore.getState().addNotification({ audience: "management", title: "B", body: "" });
      useNotificationsStore.getState().clearAll("customer");
    });

    const items = useNotificationsStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].audience).toBe("management");
  });
});
