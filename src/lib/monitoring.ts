import * as Sentry from "@sentry/nextjs";

/**
 * O que o SDK coleta sozinho, igual nos tres runtimes (cliente, servidor e
 * edge). O padrao da v11 e coletar tudo - cookie (inclui o de sessao),
 * header, corpo de requisicao, query string (lat/lng) e variavel local da
 * stack (pode ter CPF, endereco). Aqui fica tudo desligado: o que precisamos
 * pra diagnosticar vai explicito em `reportApiFailure`.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  stackFrameVariables: false,
} satisfies Sentry.BrowserOptions["dataCollection"];
