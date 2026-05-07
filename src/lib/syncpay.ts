// Configuração SyncPay — token em cache (igual kit syncpay/)
let tokenCache = {
  token: null as string | null,
  expiresAt: null as Date | null,
};

export async function getAuthToken(): Promise<string> {
  if (tokenCache.token && tokenCache.expiresAt && new Date() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const clientId = process.env.SYNCPAY_CLIENT_ID;
  const clientSecret = process.env.SYNCPAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SYNCPAY_CLIENT_ID e SYNCPAY_CLIENT_SECRET devem estar configurados");
  }

  const baseUrl = process.env.SYNCPAY_BASE_URL || "https://api.syncpayments.com.br";
  const apiUrl = baseUrl.endsWith("/")
    ? `${baseUrl}api/partner/v1/auth-token`
    : `${baseUrl}/api/partner/v1/auth-token`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorData: { message?: string } = {};
    try {
      errorData = JSON.parse(errorText) as { message?: string };
    } catch {
      errorData = { message: errorText || `Erro ${response.status}` };
    }
    throw new Error(errorData.message || `Erro ao obter token: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in?: number };

  tokenCache.token = data.access_token;
  const expiresIn = (data.expires_in || 3600) - 300;
  tokenCache.expiresAt = new Date(Date.now() + expiresIn * 1000);

  return data.access_token;
}
