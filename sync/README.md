# `sync/` — export da lógica de pagamento (SyncPay)

Esta pasta foi criada para você conseguir **copiar e integrar** a lógica de pagamento PIX em outra tela/projeto (ex.: a tela do Privacy) sem precisar “garimpar” arquivos no `syncpay-next`.

## O que contém
- **API (Next App Router)**:
  - `sync/app/api/syncpay/route.ts` (criar PIX + checar status)
  - `sync/app/api/syncpay/webhook/route.ts` (receber webhook)
- **Lib SyncPay**: `sync/lib/syncpay.ts` (auth token com cache)
- **Tipos TS**: `sync/types/syncpay.ts`
- **Planos/valores**: `sync/lib/planos.ts`
- **Modal React**: `sync/components/PaymentModal.tsx`
  - Abre → **gera PIX automaticamente**
  - Mostra QR + código copiável
  - Faz polling de status a cada 3s
  - Se pago → abre `NEXT_PUBLIC_ENTREGAVEL_URL` em nova aba
- **Wrapper opcional (iframe + postMessage)**: `sync/components/HomeWithPayment.tsx`
- **Configs Tailwind** (se o projeto destino não tiver):
  - `sync/tailwind.config.ts`
  - `sync/postcss.config.mjs`
- **Env example (sem segredos)**: `sync/.env.example`

## Próximo passo
Siga o guia em `sync/INTEGRACAO_PRIVACY.md`.

