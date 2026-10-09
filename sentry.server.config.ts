// Sentry no runtime Node da Vercel (rotas /api, BFF e render no servidor).
// Carregado por src/instrumentation.ts.
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION } from "./src/lib/monitoring";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? "development",
  dataCollection: SENTRY_DATA_COLLECTION,
});
