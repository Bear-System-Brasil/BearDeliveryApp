"use client";

import { useCallback, useEffect, useState } from "react";

import { STORAGE_KEYS, storageManager } from "@/utils/storage-manager";

/**
 * Preferência "não pedir confirmação ao aceitar entrega".
 *
 * Duas decisões de segurança aqui:
 *
 * 1. O padrão é SEMPRE confirmar. Qualquer falha de leitura (localStorage
 *    bloqueado, aba anônima, JSON corrompido) cai nesse padrão em vez de
 *    engolir o diálogo - o pior caso é o entregador confirmar uma vez a mais,
 *    não aceitar uma corrida sem querer.
 *
 * 2. A leitura acontece depois da montagem, não no inicializador do useState.
 *    No servidor não há localStorage, então ler durante a render faria o HTML
 *    do servidor divergir do cliente. Enquanto `isReady` é false a tela se
 *    comporta como se a confirmação estivesse ligada.
 *
 * `storageManager.local` já faz try/catch e checa disponibilidade do storage.
 */
export function useAcceptConfirmation() {
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = storageManager.local.get<boolean>(
      STORAGE_KEYS.DELIVERY_SKIP_ACCEPT_CONFIRM,
    );
    setSkipConfirm(stored === true);
    setIsReady(true);
  }, []);

  const updateSkipConfirm = useCallback((value: boolean) => {
    // Estado primeiro: se a escrita falhar, a preferência ainda vale nesta
    // sessão em vez de o toggle voltar sozinho na cara do usuário.
    setSkipConfirm(value);
    storageManager.local.set(
      STORAGE_KEYS.DELIVERY_SKIP_ACCEPT_CONFIRM,
      value,
    );
  }, []);

  return {
    /** Abrir o diálogo antes de aceitar? */
    shouldConfirm: !skipConfirm,
    skipConfirm,
    setSkipConfirm: updateSkipConfirm,
    /** Falso até a preferência ter sido lida do storage. */
    isReady,
  };
}
