# Integração na tela do Privacy (guia passo-a-passo)

Este guia descreve **o que copiar** e **onde colar** para reaproveitar a lógica de pagamento PIX (SyncPay) em outro projeto/tela.

> Este kit foi testado em Next.js (App Router). Se seu Privacy não for Next/App Router, me avise que eu adapto.

## 1) Copiar arquivos para o projeto do Privacy

Copie os arquivos da pasta `sync/` para dentro do **projeto destino**, mantendo a estrutura em `src/`:

- `sync/app/api/syncpay/**` → `src/app/api/syncpay/**`
- `sync/lib/syncpay.ts` → `src/lib/syncpay.ts`
- `sync/types/syncpay.ts` → `src/types/syncpay.ts`
- `sync/lib/planos.ts` → `src/lib/planos.ts`
- `sync/components/PaymentModal.tsx` → `src/components/PaymentModal.tsx`
- (opcional) `sync/components/HomeWithPayment.tsx` → `src/components/HomeWithPayment.tsx`

## 2) Ajustar alias `@/`

O código usa imports `@/…`. Garanta no `tsconfig.json` do projeto destino:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 3) Variáveis de ambiente

Crie um `.env` no projeto destino com base em `sync/.env.example` e preencha:
- `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET`
- `SYNCPAY_BASE_URL` (padrão: `https://api.syncpayments.com.br`)
- `NEXT_PUBLIC_APP_URL` (URL do deploy; usado para compor a URL do webhook)
- `SYNCPAY_WEBHOOK_TOKEN` (opcional)
- `NEXT_PUBLIC_ENTREGAVEL_URL` (link do conteúdo entregue após pagamento)

## 4) Tailwind (se o projeto destino não tiver)

O `PaymentModal.tsx` usa Tailwind.

Instale:

```bash
npm i -D tailwindcss@3 postcss autoprefixer
```

Copie/mescle configs:
- `sync/tailwind.config.ts` → `tailwind.config.ts`
- `sync/postcss.config.mjs` → `postcss.config.mjs`

E no topo do `src/app/globals.css` do projeto destino:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 5) Como abrir o modal na tela do Privacy

### Opção A (mais simples): tudo em React

No componente/página do Privacy que tem o botão “Assinar/Comprar”, controle `isOpen`:

```tsx
"use client";

import { useMemo, useState } from "react";
import PaymentModal from "@/components/PaymentModal";
import { PLANOS } from "@/lib/planos";

export function BotaoAssinarMensal() {
  const [open, setOpen] = useState(false);

  const entregavel = process.env.NEXT_PUBLIC_ENTREGAVEL_URL;
  const plano = PLANOS.Mensal;

  const product = useMemo(
    () => ({ id: plano.id, name: plano.name, entregavel: entregavel || undefined }),
    [plano.id, plano.name, entregavel],
  );

  return (
    <>
      <button onClick={() => setOpen(true)}>Assinar</button>
      <PaymentModal isOpen={open} onClose={() => setOpen(false)} product={product} price={plano.price} />
    </>
  );
}
```

### Opção B: landing estática (HTML) + modal React via `postMessage`

Se a tela do Privacy for HTML estático em `public/` e você quer manter o HTML:
- Use o wrapper `HomeWithPayment.tsx` (iframe + listener).
- No JS do HTML, no clique do botão:

```js
window.parent.postMessage({ type: "onlyfans-checkout", plano: "Mensal" }, "*");
```

## 6) Webhook (opcional)

Configure no painel SyncPay:
- URL: `{NEXT_PUBLIC_APP_URL}/api/syncpay/webhook`
- Se usar token, preferir: `Authorization: Bearer <SYNCPAY_WEBHOOK_TOKEN>`

## 7) Como o fluxo funciona (para você entender rápido)

- Abrir modal → chama `POST /api/syncpay` com `{ action: "create-pix", valor, plano }`
- Mostra QR + pix code
- Polling (a cada 3s): `POST /api/syncpay` com `{ action: "check-payment", transactionId }`
- Se status `paid/completed` → abre `NEXT_PUBLIC_ENTREGAVEL_URL`

