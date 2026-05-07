import { NextRequest, NextResponse } from "next/server";
import { SyncPayWebhookPayload } from "@/types/syncpay";

export const dynamic = 'force-dynamic';

// Webhook para receber notificações do SyncPay
// Este endpoint é chamado automaticamente pelo SyncPay quando o status do pagamento muda

export async function POST(request: NextRequest) {
  try {
    // Validar token de segurança do webhook (se configurado)
    const webhookToken = request.headers.get('x-syncpay-token') || request.headers.get('authorization');
    const expectedToken = process.env.SYNCPAY_WEBHOOK_TOKEN;

    if (expectedToken && webhookToken && webhookToken !== expectedToken && !webhookToken.includes(expectedToken)) {
      console.warn('⚠️ Token de webhook inválido ou ausente');
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    if (!expectedToken) {
      console.warn('⚠️ SYNCPAY_WEBHOOK_TOKEN não configurado - webhook aceito sem validação');
    } else {
      console.log('✅ Token de webhook validado com sucesso');
    }

    const payload: SyncPayWebhookPayload = await request.json();
    
    console.log('📥 Webhook SyncPay recebido:', JSON.stringify(payload, null, 2));

    // Tentar extrair dados de diferentes formatos possíveis
    let transactionId = null;
    let status = null;
    let value = null;
    let amount = null;

    if (payload.identifier) {
      transactionId = payload.identifier;
    } else if (payload.reference_id) {
      transactionId = payload.reference_id;
    } else if (payload.id) {
      transactionId = payload.id;
    } else if (payload.data?.identifier) {
      transactionId = payload.data.identifier;
    } else if (payload.data?.reference_id) {
      transactionId = payload.data.reference_id;
    }

    // Extrair status
    if (payload.status) {
      status = payload.status.toLowerCase();
    } else if (payload.data?.status) {
      status = payload.data.status.toLowerCase();
    }

    // Extrair valor
    if (payload.amount) {
      amount = payload.amount;
      value = typeof amount === 'number' ? amount : parseFloat(amount);
    } else if (payload.data?.amount) {
      amount = payload.data.amount;
      value = typeof amount === 'number' ? amount : parseFloat(amount);
    } else if (payload.value) {
      value = typeof payload.value === 'number' ? payload.value : parseFloat(payload.value);
    }

    // Validar se o payload contém dados da transação
    if (!transactionId) {
      console.warn('⚠️ Webhook recebido sem ID de transação');
      console.warn('Payload completo:', JSON.stringify(payload, null, 2));
      return NextResponse.json({ error: 'Payload inválido - ID de transação não encontrado' }, { status: 400 });
    }

    console.log(`📊 Webhook - Transação ${transactionId}: Status = ${status || 'unknown'}, Valor = ${value || amount || 'unknown'}`);

    // Verificar se o pagamento foi confirmado
    // SyncPay usa 'completed' como status de pagamento confirmado
    const isPagamentoConfirmado = 
      status === 'completed' || 
      status === 'paid' || 
      status === 'approved' || 
      status === 'confirmed';

    if (isPagamentoConfirmado) {
      console.log('✅✅✅ PAGAMENTO CONFIRMADO VIA WEBHOOK!');
      console.log(`💰 Transação: ${transactionId}, Valor: ${value || amount}`);

      // TODO: Implementar lógica de liberação de conteúdo aqui
      // Exemplo:
      // - Salvar no banco de dados que o pagamento foi confirmado
      // - Enviar email de confirmação
      // - Liberar acesso ao produto/serviço
      // - Enviar notificação para o cliente
    } else if (status === 'canceled' || status === 'cancelled' || status === 'failed') {
      console.log(`❌ Pagamento cancelado/falhou: ${transactionId}`);
    } else {
      console.log(`⏳ Status intermediário: ${status} para transação ${transactionId}`);
    }

    // Sempre retornar 200 para o SyncPay
    // Isso confirma que recebemos a notificação
    return NextResponse.json({ 
      success: true,
      message: 'Webhook recebido com sucesso',
      transactionId: transactionId,
      status: status
    });

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook SyncPay:', error);
    
    // Mesmo em caso de erro, retornar 200 para o SyncPay
    // para evitar que ele tente reenviar múltiplas vezes
    return NextResponse.json({ 
      success: false,
      error: 'Erro ao processar webhook',
      message: error.message 
    });
  }
}
