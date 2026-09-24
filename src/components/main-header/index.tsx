"use client";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-provider";
import { useAuthStore } from "@/stores";
import { getWorkspaceLink } from "@/constants/workspace-links";
import { getProfileRoute, isCompanyStaffRole } from "@/utils/role-helpers";
import clsx from "clsx";
import {
  ChevronDown,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Package,
  PencilLine,
  Search,
  ShoppingCart,
  Store,
  User,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { ThemeToggle } from "../ui/theme-toggle";
import Link from "next/link";
import { BearDeliveryLogo } from "../ui/bear-delivery-logo";
import Image from "next/image";

const DEFAULT_LOCATION_LABEL = "Escolha seu endereço";

interface MainHeaderProps {
  cartItems?: number;
  onCartClick?: () => void;
  showSearch?: boolean;
  showNav?: boolean;
}

export function MainHeader({
  cartItems = 0,
  onCartClick,
  showSearch = true,
}: MainHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showAuthModal, logout } = useAuth();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const workspaceLink = getWorkspaceLink(user?.role);
  // Staff de restaurante (owner, cook, delivery etc.) não compra pelo
  // próprio app - o carrinho é uma tela de cliente, não faz sentido
  // aparecer pra quem já está logado como funcionário.
  const isStaffAccount = isAuthenticated && isCompanyStaffRole(user?.role);

  const [isMounted, setIsMounted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Só usado no mobile (abaixo de sm): controla se o ícone de busca virou
  // campo de texto, escondendo a logo/endereço pra abrir espaço. A partir
  // de sm a busca é uma pill sempre visível e esse estado é ignorado.
  const [searchOpen, setSearchOpen] = useState(false);
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION_LABEL);
  const [locationOpen, setLocationOpen] = useState(false);
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (searchOpen) mobileSearchInputRef.current?.focus();
  }, [searchOpen]);

  const handleSearchSubmit = () => {
    const query = searchQuery.trim();
    if (!query) {
      router.push("/");
      return;
    }

    // Redireciona para a página inicial com o parâmetro de busca
    router.push(`/?search=${encodeURIComponent(query)}`);

    setSearchOpen(false);
    searchInputRef.current?.blur();
    mobileSearchInputRef.current?.blur();
  };
  // Nova função de busca ao vivo
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (pathname === "/") {
      if (value.trim() === "") {
        router.replace("/", { scroll: false });
      } else {
        router.replace(`/?search=${encodeURIComponent(value)}`, {
          scroll: false,
        });
      }
    }
  };
  const saveLocation = (location: {
    lat: number;
    lng: number;
    city: string;
    address: string;
  }) => {
    document.cookie = `userLocation=${encodeURIComponent(
      JSON.stringify(location),
    )}; path=/; max-age=86400; SameSite=Lax`;
    setLocationLabel(location.address || location.city);
    setLocationOpen(false);
    setIsChangingLocation(false);
    setManualLocation("");
    setLocationError("");
    window.dispatchEvent(new Event("locationChanged"));
  };

  const handleManualLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = manualLocation.trim();
    if (!query) {
      setLocationError("Digite uma cidade, bairro ou endereço.");
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          `${query}, Brasil`,
        )}&format=jsonv2&limit=1&addressdetails=1`,
      );
      if (!response.ok) throw new Error("Falha ao buscar localização");
      const results = await response.json();
      const result = results?.[0];
      if (!result?.lat || !result?.lon) {
        throw new Error("Localização não encontrada");
      }
      const city =
        result.address?.city ||
        result.address?.town ||
        result.address?.municipality ||
        query;
      saveLocation({
        lat: Number(result.lat),
        lng: Number(result.lon),
        city,
        address: result.display_name || query,
      });
    } catch {
      setLocationError(
        "Não encontramos esse local. Tente uma cidade ou bairro.",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Seu navegador não permite localização automática.");
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
          }),
      );
      const { latitude, longitude } = position.coords;
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`,
      );
      if (!response.ok) throw new Error("Falha ao buscar endereço");
      const data = await response.json();
      const city = data.city || data.locality || "Minha localização";
      const address = [
        data.street,
        data.streetNumber,
        data.neighbourhood,
        city,
        data.principalSubdivision,
      ]
        .filter(Boolean)
        .join(", ");
      saveLocation({
        lat: latitude,
        lng: longitude,
        city,
        address: address || city,
      });
    } catch {
      setLocationError("Não foi possível encontrar sua localização.");
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    const syncLocation = () => {
      const locationCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("userLocation="));
      if (!locationCookie) {
        setLocationLabel(DEFAULT_LOCATION_LABEL);
        return;
      }
      const encodedLocation = locationCookie.split("=").slice(1).join("=");
      try {
        const parsedLocation = JSON.parse(decodeURIComponent(encodedLocation));
        const label =
          parsedLocation?.address ||
          parsedLocation?.locality ||
          parsedLocation?.city;
        setLocationLabel(label || DEFAULT_LOCATION_LABEL);
      } catch {
        setLocationLabel(DEFAULT_LOCATION_LABEL);
      }
    };
    syncLocation();
    window.addEventListener("locationChanged", syncLocation);
    return () => {
      window.removeEventListener("locationChanged", syncLocation);
    };
  }, []);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return () => {
      unsub();
    };
  }, []);

  const canShowAuthUI = isMounted && hasHydrated;

  const handleProfileClick = () => {
    router.push(getProfileRoute(user?.role));
    setMobileMenuOpen(false);
  };

  const handleCartClick = () => {
    if (onCartClick) onCartClick();
    else router.push("/cart");
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
    setMobileMenuOpen(false);
  };

  const hasSavedLocation = locationLabel !== DEFAULT_LOCATION_LABEL;
  const currentLocationText = hasSavedLocation
    ? locationLabel
    : "Nenhum endereço selecionado";

  return (
    <header
      className={clsx(
        "fixed top-1 left-1 right-1 z-50",
        "bg-background/95 border border-brand-100/50 dark:border-brand-900/50",
        "rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden",
      )}
    >
      <div className="px-3 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center justify-between">
          {/* ===== LADO ESQUERDO (Logo + Endereço) ===== */}
          <div
            className={clsx(
              "flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2",
              searchOpen && "max-sm:hidden",
            )}
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link href="/" className="shrink-0" aria-label="BearDelivery - início">
                <BearDeliveryLogo iconOnlyBelow="lg" />
              </Link>

              <div className="min-w-0 leading-tight">
                <Sheet
                  open={locationOpen}
                  onOpenChange={(open) => {
                    setLocationOpen(open);
                    if (!open) {
                      setLocationError("");
                      setIsChangingLocation(false);
                      setManualLocation("");
                    }
                  }}
                >
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="flex max-w-[150px] cursor-pointer items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted xs:max-w-[190px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[240px]"
                      title="Alterar endereço"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 fill-brand-500 text-brand-500" />
                      <span className="truncate" title={locationLabel}>
                        {locationLabel}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </SheetTrigger>

                  <SheetContent
                    side="bottom"
                    className="rounded-t-3xl border-t border-brand-100 dark:border-brand-900 bg-card px-4 pb-8 pt-4 sm:px-6"
                  >
                    {/* Handle visual (opcional mas fica bonito) */}
                    <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

                    <div className="mx-auto w-full max-w-xl space-y-4">
                      <div className="space-y-1">
                        <SheetTitle className="text-lg font-bold text-foreground">
                          Endereço de entrega
                        </SheetTitle>
                        <p className="text-sm text-muted-foreground">
                          Onde seu pedido será entregue
                        </p>
                      </div>

                      {/* Card do endereço atual */}
                      <div className="rounded-2xl border border-brand-100 dark:border-brand-900 bg-brand-50/60 dark:bg-brand-950/40 dark:bg-brand-950/30 p-4">
                        <div className="flex gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-brand-500 shadow-sm">
                            <MapPin className="h-5 w-5 fill-brand-500" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                              Entregando em
                            </p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                              {currentLocationText}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setManualLocation("");
                              setLocationError("");
                              setIsChangingLocation(true);
                            }}
                            className="h-11 justify-center rounded-xl border-brand-200 dark:border-brand-800 bg-card text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            Trocar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={locationLoading}
                            onClick={handleCurrentLocation}
                            className="h-11 justify-center rounded-xl border-border bg-card text-foreground hover:bg-muted"
                          >
                            <Navigation className="mr-2 h-4 w-4" />
                            Usar atual
                          </Button>
                        </div>
                      </div>

                      {/* Formulário só aparece quando o usuário clica em "Trocar" */}
                      {isChangingLocation && (
                        <form
                          onSubmit={handleManualLocation}
                          className="rounded-2xl border border-border bg-muted p-4"
                        >
                          <p className="mb-3 text-sm font-semibold text-foreground">
                            Digite o novo endereço
                          </p>
                          <div className="flex flex-col gap-2">
                            <Input
                              value={manualLocation}
                              onChange={(event) =>
                                setManualLocation(event.target.value)
                              }
                              placeholder="Ex.: Rua Machado de Assis, 334"
                              className="h-11 rounded-xl bg-card"
                            // ← sem autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsChangingLocation(false);
                                  setManualLocation("");
                                  setLocationError("");
                                }}
                                className="h-11 flex-1 rounded-xl"
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                disabled={locationLoading}
                                className="h-11 flex-1 rounded-xl bg-brand-500 hover:bg-brand-600"
                              >
                                {locationLoading ? "Buscando..." : "Salvar"}
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}

                      {locationError && (
                        <p className="rounded-xl bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                          {locationError}
                        </p>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* ===== ACTIONS ===== */}
          <div
            className={clsx(
              "flex items-center gap-1.5 sm:gap-2",
              searchOpen ? "max-sm:min-w-0 max-sm:flex-1" : "shrink-0",
            )}
          >
            {showSearch && (
              <>
                {/* Mobile (<sm): ícone que vira campo, escondendo a
                    logo/endereço pra abrir espaço. Fecha sozinho ao perder
                    foco vazio, ou ao apertar Esc/enviar a busca. */}
                <div className="sm:hidden">
                  {!searchOpen ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-xl border-0 bg-muted/50"
                      onClick={() => setSearchOpen(true)}
                      aria-label="Buscar"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchSubmit();
                      }}
                      className="relative flex min-w-0 flex-1 items-center"
                    >
                      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        ref={mobileSearchInputRef}
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            if (searchQuery) setSearchQuery("");
                            else setSearchOpen(false);
                          }
                        }}
                        onBlur={() => {
                          if (!searchQuery.trim()) setSearchOpen(false);
                        }}
                        className={clsx(
                          "h-9 w-full rounded-xl border-0 bg-muted/50 pl-8 text-sm focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-brand-400",
                          searchQuery ? "pr-7" : "pr-2",
                        )}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSearchChange("");
                            mobileSearchInputRef.current?.focus();
                          }}
                          aria-label="Limpar busca"
                          className="absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </form>
                  )}
                </div>

                {/* sm+: pill sempre visível, sem toggle - já cabe ao lado
                    da logo/endereço sem precisar esconder nada. */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchSubmit();
                  }}
                  className="relative hidden items-center sm:flex"
                >
                  <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        if (searchQuery) setSearchQuery("");
                        else searchInputRef.current?.blur();
                      }
                    }}
                    className={clsx(
                      "h-10 w-36 rounded-xl border-0 bg-muted/50 pl-9 text-sm focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-brand-400 md:w-44 lg:w-56",
                      searchQuery ? "pr-7" : "pr-2",
                    )}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Limpar busca"
                      className="absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </form>
              </>
            )}
            {/* Carrinho */}
            {!isStaffAccount && (
              <Button
                variant="outline"
                size="icon"
                className="relative hidden h-9 w-9 rounded-xl border-0 bg-muted/50 md:flex md:h-10 md:w-10"
                onClick={handleCartClick}
                aria-label="Carrinho"
              >
                <ShoppingCart className="h-4 w-4" />
                {isMounted && cartItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                    {cartItems}
                  </span>
                )}
              </Button>
            )}

            {/* Meus Pedidos */}
            {canShowAuthUI && isAuthenticated && user?.role === "client" && (
              <Button
                variant="outline"
                size="icon"
                className="hidden h-9 w-9 rounded-xl border-0 bg-muted/50 md:flex md:h-10 md:w-10"
                onClick={() => router.push("/orders")}
                aria-label="Meus Pedidos"
              >
                <Package className="h-4 w-4" />
              </Button>
            )}

            {/* Notificações */}
            {canShowAuthUI && isAuthenticated && user?.role === "client" && (
              <div className={clsx(searchOpen && "max-sm:hidden")}>
                <NotificationBell audience="customer" />
              </div>
            )}

            {/* Menu / Entrar */}
            {canShowAuthUI && (
              <div className={clsx(searchOpen && "max-sm:hidden")}>
                {isAuthenticated ? (
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border-0 bg-muted/50 cursor-pointer"
                      >
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>

                    <SheetContent
                      side="right"
                      className="w-[300px] sm:w-[400px]"
                    >
                      <SheetTitle className="sr-only">
                        Menu de navegação
                      </SheetTitle>
                      <div className="flex flex-col h-full">
                        <div className="mb-6 flex items-center justify-between pr-8">
                          <Link
                            href="/"
                            onClick={() => setMobileMenuOpen(false)}
                            className="shrink-0"
                          >
                            <BearDeliveryLogo />
                          </Link>

                          <ThemeToggle />
                        </div>

                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start rounded-xl"
                            onClick={handleProfileClick}
                          >
                            {user?.photoUrl ? (
                              <Image
                                src={user.photoUrl}
                                alt={user.name || "User"}
                                width={20}
                                height={20}
                                className="h-5 w-5 rounded-full object-cover mr-2"
                              />
                            ) : (
                              <User className="h-4 w-4 mr-2" />
                            )}
                            Perfil
                          </Button>

                          {!isStaffAccount && (
                            <Button
                              variant="outline"
                              className="w-full justify-start rounded-xl"
                              onClick={handleCartClick}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Carrinho
                              {cartItems > 0 && (
                                <span className="ml-auto bg-brand-500 text-white text-xs px-2 py-1 rounded-full">
                                  {cartItems}
                                </span>
                              )}
                            </Button>
                          )}

                          {user?.role === "client" && (
                            <Button
                              variant="outline"
                              className="w-full justify-start rounded-xl"
                              onClick={() => {
                                router.push("/orders");
                                setMobileMenuOpen(false);
                              }}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Meus Pedidos
                            </Button>
                          )}

                          {user?.role === "client" && (
                            <Button
                              variant="outline"
                              className="w-full justify-start rounded-xl"
                              onClick={() => {
                                router.push("/restaurant-landing-page");
                                setMobileMenuOpen(false);
                              }}
                            >
                              <Store className="h-4 w-4 mr-2" />
                              Cadastrar meu restaurante
                            </Button>
                          )}

                          {workspaceLink && (
                            <Button
                              variant="outline"
                              className="w-full justify-start rounded-xl"
                              onClick={() => {
                                router.push(workspaceLink.href);
                                setMobileMenuOpen(false);
                              }}
                            >
                              <workspaceLink.icon className="h-4 w-4 mr-2" />
                              {workspaceLink.label}
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex h-[38px] w-full items-center gap-[11px] rounded-[14px] bg-brand-500 px-3 text-[13px] font-semibold text-white shadow-[0_6px_14px_var(--tw-shadow-color)] shadow-brand-500/35 transition-colors hover:bg-brand-400 cursor-pointer"
                          >
                            <LogOut className="h-4 w-4 shrink-0" />
                            <span className="truncate">Sair da conta</span>
                          </button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted hover:text-brand-600 dark:hover:text-brand-400 sm:inline-flex"
                      onClick={() => router.push("/restaurant-landing-page")}
                    >
                      <Store className="mr-1.5 h-3.5 w-3.5" />
                      Tem um restaurante?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-0 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900 font-medium"
                      onClick={() => showAuthModal("login")}
                    >
                      Entrar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
