"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRestaurants, useSyncedUserLocation } from "@/hooks";
import { useCartStore } from "@/stores";
import { useAuth } from "@/contexts/auth-provider";
import { AnimatedBackground } from "@/components/ui/custom";
import { TrendingRestaurantsSection } from "@/components/home-page/trending-restaurants-section";
import { CouponBanner } from "@/components/home-page/coupon-banner";
import { MainHeader } from "@/components/main-header";
import { Footer } from "@/components/footer";
import { Coords } from "@/types/restaurant";
import { BannerCarousel } from "../banner-carousel";

type BearDeliveryAppPageProps = {
  initialLocation?: Coords | null;
};

export function BearDeliveryAppPage({
  initialLocation = null,
}: BearDeliveryAppPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAuthModal } = useAuth();
  const { getTotalItems } = useCartStore();
  const { location } = useSyncedUserLocation(initialLocation);
  const [visibleCount, setVisibleCount] = useState(4);

  // 1. Captura o termo de busca da URL
  const searchQuery = searchParams.get("search") || "";

  const { data: restaurants = [], isLoading: loadingCompanies } =
    useRestaurants(location);

  const loading = loadingCompanies;

  // 2. Filtra os restaurantes com base na busca (ignorando maiúsculas/minúsculas)
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery) return restaurants;

    const lowerQuery = searchQuery.toLowerCase();
    return restaurants.filter((restaurant) => {
      const name = restaurant.tradeName || "";
      return name.toLowerCase().includes(lowerQuery);
    });
  }, [restaurants, searchQuery]);

  const handleCartClick = () => {
    router.push("/cart");
  };

  useEffect(() => {
    const openAuth = searchParams.get("openAuth");
    if (openAuth === "true") {
      showAuthModal();
      router.replace("/", { scroll: false });
    }
  }, [searchParams, showAuthModal, router]);

  useEffect(() => {
    // 3. O count visual agora baseia-se na lista filtrada
    if (
      !loading &&
      filteredRestaurants.length > 0 &&
      visibleCount < filteredRestaurants.length
    ) {
      const timeout = setTimeout(
        () => setVisibleCount(filteredRestaurants.length),
        100,
      );
      return () => clearTimeout(timeout);
    }
  }, [loading, filteredRestaurants.length, visibleCount]);

  useEffect(() => {
    if (loading) {
      setVisibleCount(4);
    }
  }, [loading]);

  // 4. Utiliza a lista filtrada para popular a página
  const trendingRestaurants = filteredRestaurants.slice(0, 4);

  return (
    <AnimatedBackground blobCount={4} showBlobs={true} className="py-0">
      <div className="flex min-h-screen flex-col">
        <MainHeader
          cartItems={getTotalItems()}
          onCartClick={handleCartClick}
          showSearch={true}
          showNav={false}
        />

        <main className="flex-1 flex flex-col pt-24">
          {/* Oculta o banner se o usuário estiver buscando algo para dar foco aos resultados */}
          {!searchQuery && <BannerCarousel />}

          <TrendingRestaurantsSection
            trendingRestaurants={trendingRestaurants}
            visibleCount={visibleCount}
            restaurants={filteredRestaurants}
            loading={loading}
            hasUserLocation={Boolean(location)}
          />

          <CouponBanner />
        </main>

        <Footer />
      </div>
    </AnimatedBackground>
  );
}