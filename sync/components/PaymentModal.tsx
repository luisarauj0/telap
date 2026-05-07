"use client";

import { useState, useEffect, useCallback } from "react";
import { SyncPayPixResponse, SyncPayStatusResponse } from "@/types/syncpay";

// Interface genérica para o produto/item a ser vendido
interface Product {
  id: string;
  name: string;
  entregavel?: string; // URL ou link do entregável após pagamento
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  price?: number;
  // Callback opcional quando o pagamento é confirmado
  onPaymentConfirmed?: (productId: string) => void;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  product, 
  price = 49.90,
  onPaymentConfirmed 
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<SyncPayPixResponse | null>(null);
  const [pixStatus, setPixStatus] = useState<"created" | "paid" | "expired" | "canceled">("created");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createAttempt, setCreateAttempt] = useState(0);

  // Resetar estado ao fechar modal
  useEffect(() => {
    if (!isOpen) {
      setPixData(null);
      setPixStatus("created");
      setError(null);
      setCopied(false);
      setIsProcessing(false);
      setCreateAttempt(0);
    }
  }, [isOpen]);

  const loadPix = useCallback(
    async (signal: AbortSignal) => {
      setIsProcessing(true);
      setError(null);
      try {
        const response = await fetch("/api/syncpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-pix",
            valor: price,
            plano: product.name,
          }),
          signal,
        });
        const data = await response.json();
        if (signal.aborted) return;
        if (!response.ok) {
          throw new Error(data.error || "Erro ao criar PIX");
        }
        setPixData(data as SyncPayPixResponse);
        setPixStatus("created");
      } catch (err: unknown) {
        if (signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Erro ao processar pagamento";
        setError(msg);
        console.error("Erro ao criar PIX:", err);
      } finally {
        if (!signal.aborted) {
          setIsProcessing(false);
        }
      }
    },
    [price, product.name],
  );

  useEffect(() => {
    if (!isOpen) return;
    const ac = new AbortController();
    void loadPix(ac.signal);
    return () => ac.abort();
  }, [isOpen, createAttempt, loadPix]);

  // Polling para verificar status do PIX
  useEffect(() => {
    if (!pixData || pixStatus === "paid" || pixStatus === "expired" || pixStatus === "canceled") {
      return;
    }

    // Polling SyncPay - verificar status a cada 3 segundos
    let pollCount = 0;
    const maxPolls = 120; // 120 polls = 6 minutos (120 * 3 segundos)
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        console.log(`🔄 Verificando status da transação ${pixData.identifier}... (tentativa ${pollCount}/${maxPolls})`);
        
        const response = await fetch("/api/syncpay", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "check-payment",
            transactionId: pixData.identifier
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Erro ao verificar pagamento:', {
            status: response.status,
            error: errorData.error || errorData.message || 'Erro desconhecido',
            details: errorData
          });
          return;
        }

        const data: SyncPayStatusResponse = await response.json();
        console.log('📥 Resposta completa da API SyncPay:', JSON.stringify(data, null, 2));

        const status = data.status?.toLowerCase() || 'pending';
        const paidAt = data.paid_at;

        console.log('📊 Status do pagamento SyncPay:', status);
        console.log('📊 PaidAt:', paidAt);

        // SyncPay: pagamento confirmado APENAS quando status for 'completed' ou 'paid'
        // NÃO considerar paid_at sozinho, pois pode estar preenchido mesmo com status pending
        const isPagamentoConfirmado = 
          status === 'paid' || 
          status === 'completed';

        if (isPagamentoConfirmado) {
          console.log('✅✅✅ PAGAMENTO CONFIRMADO! Liberando conteúdo...');
          setPixStatus("paid");
          
          // Salvar no localStorage que este produto foi comprado
          if (typeof window !== 'undefined') {
            const purchasedProducts = JSON.parse(localStorage.getItem('purchasedProducts') || '[]');
            if (!purchasedProducts.includes(product.id)) {
              purchasedProducts.push(product.id);
              localStorage.setItem('purchasedProducts', JSON.stringify(purchasedProducts));
            }
          }
          
          // Fechar modal imediatamente (sem temporizador)
          onClose();
          
          // Abrir entregável do produto imediatamente se existir
          if (product.entregavel) {
            console.log(`🔗 Abrindo entregável: ${product.entregavel}`);
            window.open(product.entregavel, "_blank");
          }
          
          // Chamar callback se fornecido
          if (onPaymentConfirmed) {
            onPaymentConfirmed(product.id);
          }
        } else if (status === 'pending' || status === 'processing' || status === 'created') {
          console.log('⏳ Aguardando pagamento... Status:', status);
          setPixStatus("created");
        } else if (status === 'canceled' || status === 'cancelled') {
          console.log('❌ Pagamento cancelado. Status:', status);
          setPixStatus("canceled");
        } else {
          console.log('⚠️ Status:', status, '- Continuando verificação...');
        }
        
        // Parar polling após máximo de tentativas
        if (pollCount >= maxPolls) {
          console.log('⏰ Polling atingiu o limite máximo. Parando verificação automática.');
          clearInterval(interval);
          setError('Tempo limite de verificação atingido. Por favor, verifique o pagamento manualmente.');
        }
      } catch (error: any) {
        console.error('Erro ao verificar pagamento:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pixData, pixStatus, product.entregavel, onClose, product.id, onPaymentConfirmed]);

  const copyPixCode = () => {
    const pixCode = pixData?.pix_code;
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const pixCode = pixData?.pix_code;
  const qrCodeUrl = pixCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(pixCode)}`
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-of-blue to-of-blue-deep px-5 py-4">
          <h2 className="text-lg font-bold tracking-tight text-white">Pagamento PIX</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-2xl leading-none text-white/90 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!pixData ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-5 px-5 py-10">
              {error && !isProcessing ? (
                <>
                  <p className="max-w-xs text-center text-sm text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={() => setCreateAttempt((n) => n + 1)}
                    className="rounded-xl bg-of-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-of-blue-deep"
                  >
                    Tentar novamente
                  </button>
                </>
              ) : (
                <>
                  <svg
                    className="h-10 w-10 animate-spin text-of-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <p className="text-center text-sm font-medium text-of-muted">Gerando PIX…</p>
                </>
              )}
            </div>
          ) : pixStatus === "paid" ? (
            <div className="space-y-5 px-5 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-of-blue to-of-blue-deep text-3xl text-white shadow-lg">
                ✓
              </div>
              <h3 className="text-xl font-bold text-of-navy">Pagamento confirmado!</h3>
              <p className="text-sm text-of-muted">Obrigado pela compra. O conteúdo foi aberto em nova aba, se configurado.</p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-of-blue py-3 font-bold text-white transition hover:bg-of-blue-deep"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="space-y-5 px-5 py-6">
              <p className="text-center text-sm font-semibold text-of-blue-deep">QR Code gerado com sucesso!</p>
              <p className="text-center text-base font-bold text-of-navy">Escaneie o QR Code</p>

              {qrCodeUrl ? (
                <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-4">
                  <img src={qrCodeUrl} alt="QR Code PIX" className="h-64 w-64 object-contain" />
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="block text-left text-sm font-bold text-of-navy">Ou copie o código PIX</label>
                <input
                  type="text"
                  value={pixData.pix_code || ""}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 font-mono text-xs leading-relaxed text-of-navy"
                />
                <button
                  type="button"
                  onClick={copyPixCode}
                  className="w-full rounded-xl bg-of-blue py-3.5 text-center text-base font-bold text-white shadow transition hover:bg-of-blue-deep"
                >
                  {copied ? "✓ Copiado" : "Copiar código PIX"}
                </button>
              </div>

              <div className="rounded-xl border border-of-hint-border bg-of-hint px-4 py-3 text-sm text-slate-800">
                <div className="mb-2 flex items-center gap-2 font-semibold text-of-navy">
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-of-blue-deep text-xs font-bold text-white"
                    aria-hidden
                  >
                    i
                  </span>
                  Instruções
                </div>
                <ul className="list-disc space-y-1.5 pl-5 text-slate-700">
                  <li>Escaneie o QR Code com seu app bancário</li>
                  <li>Ou copie e cole o código PIX</li>
                  <li>O pagamento será confirmado automaticamente</li>
                </ul>
              </div>

              {pixStatus === "created" ? (
                <div className="flex items-center justify-center gap-2 text-sm text-of-blue-deep">
                  <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Aguardando confirmação do pagamento…</span>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              ) : null}

              <div className="border-t border-slate-200 pt-5 text-center">
                <p className="text-2xl font-bold text-of-navy">R$ {price.toFixed(2).replace(".", ",")}</p>
                <p className="mt-1 text-sm text-of-muted">{product.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
