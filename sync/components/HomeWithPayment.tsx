"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PaymentModal from "@/components/PaymentModal";
import { PLANOS } from "@/lib/planos";

const CHECKOUT_MSG = "onlyfans-checkout";

function HomeInner() {
  const searchParams = useSearchParams();
  const openedFromQuery = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [planoKey, setPlanoKey] = useState<string>("Mensal");

  const produto = useMemo(() => PLANOS[planoKey] ?? PLANOS.Mensal, [planoKey]);

  const entregavel = process.env.NEXT_PUBLIC_ENTREGAVEL_URL;

  const product = useMemo(
    () => ({
      id: produto.id,
      name: produto.name,
      entregavel: entregavel || undefined,
    }),
    [produto.id, produto.name, entregavel],
  );

  const openForPlano = useCallback((plano: string) => {
    const key = plano && PLANOS[plano] ? plano : "Mensal";
    setPlanoKey(key);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (openedFromQuery.current) return;
    const q = searchParams.get("plano");
    if (q && PLANOS[q]) {
      openedFromQuery.current = true;
      openForPlano(q);
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, openForPlano]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const d = ev.data;
      if (!d || typeof d !== "object" || d.type !== CHECKOUT_MSG) return;
      const plano = typeof d.plano === "string" ? d.plano : "Mensal";
      openForPlano(plano);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [openForPlano]);

  return (
    <>
      <iframe title="Perfil" src="/index.html" className="h-[100dvh] w-full border-0 block" allow="autoplay" />
      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={product}
        price={produto.price}
        onPaymentConfirmed={() => {}}
      />
    </>
  );
}

export default function HomeWithPayment() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] w-full bg-zinc-950" aria-hidden />}>
      <HomeInner />
    </Suspense>
  );
}
