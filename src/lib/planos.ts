export const PLANOS: Record<string, { id: string; name: string; price: number }> = {
  Mensal: { id: "plano-mensal", name: "Assinatura mensal (31 dias)", price: 19.9 },
  Trimestral: { id: "plano-trimestral", name: "Assinatura trimestral (3 meses)", price: 50.0 },
  Anual: { id: "plano-anual", name: "Assinatura anual (12 meses)", price: 99.9 },
};

export type PlanoKey = keyof typeof PLANOS;
