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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Rota sem query string e sem ids. Agrupa no Sentry todas as falhas da
 * mesma rota num issue só, e não manda pra fora coordenada de query
 * (`/company?lat=...`) nem id de pedido/carrinho.
 */
export function normalizeEndpoint(endpoint: string): string {
  const [path] = endpoint.split("?");
  return path
    .split("/")
    .map((segment) => {
      const decoded = safeDecode(segment);
      return UUID.test(decoded) ||
        decoded.startsWith("cart:") ||
        /^\d+$/.test(decoded)
        ? ":id"
        : segment;
    })
    .join("/");
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** POST /order/:id finaliza o pedido - é a falha que vira pedido perdido. */
function isFinishOrder(method: string, path: string): boolean {
  return method === "POST" && path === "/order/:id";
}

interface ApiFailure {
  method: string;
  endpoint: string;
  /** Ausente quando a requisição nem chegou a ter resposta (rede). */
  status?: number;
  message?: string;
}

/**
 * Reporta ao Sentry falha de API que o usuário não consegue resolver
 * sozinho. `apiRequest` nunca lança - devolve `{ success: false }` - então
 * sem isto o backend pode recusar tudo e o Sentry não fica sabendo.
 *
 * Regra:
 * - 5xx em qualquer rota;
 * - finalizar pedido: qualquer falha, inclusive 4xx e rede, menos 401
 *   (sessão expirada já tem fluxo próprio).
 *
 * 4xx fora da finalização fica de fora: é validação normal do usuário e
 * estouraria a cota do plano gratuito. Falha de rede fora da finalização
 * também: é o 4G do cliente, não o servidor.
 */
export function reportApiFailure({
  method,
  endpoint,
  status,
  message,
}: ApiFailure): void {
  const path = normalizeEndpoint(endpoint);
  const serverError = status !== undefined && status >= 500;
  const criticalFailure = isFinishOrder(method, path) && status !== 401;

  if (!serverError && !criticalFailure) return;

  const statusLabel = status === undefined ? "rede" : String(status);

  Sentry.captureMessage(`API ${method} ${path} falhou (${statusLabel})`, {
    level: "error",
    tags: {
      "api.method": method,
      "api.endpoint": path,
      "api.status": statusLabel,
    },
    // Só a mensagem do backend. O corpo da requisição/resposta fica de
    // fora: pode ter CPF, telefone e endereço.
    extra: { serverMessage: message },
    fingerprint: ["api-failure", method, path, statusLabel],
  });
}
