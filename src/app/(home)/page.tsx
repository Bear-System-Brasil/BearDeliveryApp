import { cookies } from "next/headers";

import { BearDeliveryAppPage } from "@/components/home-page/home-page-wrapper";

export default async function BearDeliveryApp() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("userLocation")?.value;

  let userLocation = null;

  try {
    userLocation = raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.log("Erro ao parsear cookie: ", err);
  }

  return <BearDeliveryAppPage initialLocation={userLocation} />;
}
