// Netlify Function: Create Mercado Pago Preference
// Env var required: MP_ACCESS_TOKEN

// CORS helpers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const admin = require('firebase-admin');
try {
  if (!admin.apps.length) {
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey && privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    } else if (svc) {
      const parsed = JSON.parse(svc);
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, credential: admin.credential.applicationDefault() });
    } else {
      admin.initializeApp();
    }
  }
} catch (e) {
  // ignore, will fail later if DB is required and not available
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'OK' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return { statusCode: 500, headers: corsHeaders, body: 'Missing MP_ACCESS_TOKEN' };
    }

    const body = JSON.parse(event.body || '{}');
    const { title, quantity = 1, currency_id = 'BRL', unit_price, back_url } = body;

    // Identificação do usuário (para o pedido fallback)
    const userId = body.userId || null;
    const customerEmail = body.customerEmail || body.buyerEmail || body.buyer || null;

    if (!title || typeof unit_price === 'undefined') {
      return { statusCode: 400, headers: corsHeaders, body: 'Invalid payload' };
    }

    // URLs de retorno
    const baseUrl = back_url || process.env.MP_BACK_BASE_URL || process.env.SITE_URL || process.env.URL || (event && event.headers && event.headers.host ? (`https://${event.headers.host}`) : null);
    let siteBase = baseUrl;
    try { siteBase = new URL(baseUrl).origin; } catch(_) {}
    const successUrl = (back_url ? `${back_url}?mp_status=success` : process.env.MP_BACK_URL_SUCCESS || (baseUrl ? `${baseUrl}/?mp_status=success` : 'https://example.com/sucesso'));
    const failureUrl = (back_url ? `${back_url}?mp_status=failure` : process.env.MP_BACK_URL_FAILURE || (baseUrl ? `${baseUrl}/?mp_status=failure` : 'https://example.com/falha'));
    const pendingUrl = (back_url ? `${back_url}?mp_status=pending` : process.env.MP_BACK_URL_PENDING || (baseUrl ? `${baseUrl}/?mp_status=pending` : 'https://example.com/pendente'));

    // Referência externa
    const externalRef = body.external_reference || `xtreino_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // O preço unitário já vem corrigido do front‑end (sem validação de cupom)
    const finalUnitPrice = Number(unit_price);

    // Inferir tipo da compra (para registro de fallback)
    const titleLower = String(title || '').toLowerCase();
    const isTokenContext = String(externalRef || '').startsWith('tokens_') || /token/.test(titleLower);
    const inferredType = body.type || (isTokenContext ? 'tokens_purchase' : (body.multiple_reservations ? 'event_reservation' : 'purchase'));

    // Preferência para o Mercado Pago
    const preferencePayload = {
      items: [
        {
          title,
          quantity,
          currency_id,
          unit_price: finalUnitPrice
        }
      ],
      back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
      auto_return: 'approved',
      notification_url: `${siteBase}/.netlify/functions/payment-notification`,
      external_reference: externalRef
    };

    // Fallback: garantir documento em `orders` para que o webhook consiga
    // creditar tokens / atualizar status mesmo que o cliente não tenha persistido.
    let fallbackWhatsappLink = null;
    try {
      if (admin && admin.firestore && body.multiple_reservations) {
        try {
          const eventType = body.multiple_reservations.eventType || body.eventType;
          const schedule = body.multiple_reservations.schedules ? body.multiple_reservations.schedules[0] : null;
          const date = body.multiple_reservations.dates ? body.multiple_reservations.dates[0] : null;
          if (eventType && date) {
            const db = admin.firestore();
            const whatsappLinksRef = db.collection('whatsapp_links');
            if (schedule) {
              const hourMatch = String(schedule || '').match(/(\d{1,2})h/);
              if (hourMatch) {
                const hour = hourMatch[1] + 'h';
                const q = await whatsappLinksRef
                  .where('eventType', '==', eventType)
                  .where('schedule', '==', hour)
                  .where('status', '==', 'active')
                  .limit(1).get();
                if (!q.empty) fallbackWhatsappLink = q.docs[0].data().link;
              }
            }
            if (!fallbackWhatsappLink) {
              const q = await whatsappLinksRef
                .where('eventType', '==', eventType)
                .where('schedule', '==', null)
                .where('status', '==', 'active')
                .limit(1).get();
              if (!q.empty) fallbackWhatsappLink = q.docs[0].data().link;
            }
          }
        } catch (linkErr) {
          console.warn('⚠️ Could not fetch whatsappLink for fallback order:', linkErr?.message || linkErr);
        }
      }
    } catch (linkFetchErr) {
      // ignore
    }

    try {
      if (admin && admin.firestore) {
        const db = admin.firestore();
        const ordersRef = db.collection('orders');
        const q = await ordersRef.where('external_reference', '==', externalRef).limit(1).get();
        if (q.empty) {
          let orderQuantity = quantity || 1;
          if (inferredType === 'tokens_purchase') {
            if (!body.quantity) {
              const m = String(title || '').match(/(\d+)\s*token/i);
              if (m && m[1]) orderQuantity = Number(m[1]);
            }
          }
          const orderDoc = {
            title: title || 'Pedido',
            item: title || 'Item',
            amount: finalUnitPrice,
            total: finalUnitPrice * orderQuantity,
            currency: currency_id || 'BRL',
            status: 'pending',
            external_reference: externalRef,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            quantity: orderQuantity,
            customer: customerEmail || body.customer || null,
            buyerEmail: customerEmail || body.buyerEmail || body.buyer || null,
            userId: userId || null,
            uid: userId || null,
            teamName: body.teamName || (body.multiple_reservations && Array.isArray(body.multiple_reservations.teams) ? (body.multiple_reservations.teams[0] || null) : null),
            teams: (body.multiple_reservations && body.multiple_reservations.teams) || null,
            schedules: (body.multiple_reservations && body.multiple_reservations.schedules) || null,
            dates: (body.multiple_reservations && body.multiple_reservations.dates) || null,
            eventType: (body.multiple_reservations && body.multiple_reservations.eventType) || body.eventType || body.type || inferredType,
            phone: body.phone || body.contact || null,
            whatsappLink: body.whatsappLink || body.groupLink || fallbackWhatsappLink || null,
            groupLink: body.groupLink || body.whatsappLink || fallbackWhatsappLink || null,
            metadata: {
              quantity: orderQuantity,
              multiple_reservations: body.multiple_reservations || null
            },
            type: inferredType
          };
          await ordersRef.add(orderDoc);
          console.log('✅ Created fallback order for external_reference:', externalRef);
        }
      }
    } catch (orderEnsureErr) {
      console.warn('⚠️ Could not ensure orders doc for external_reference:', externalRef, orderEnsureErr && orderEnsureErr.message ? orderEnsureErr.message : orderEnsureErr);
    }

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferencePayload)
    });

    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 502, headers: corsHeaders, body: `Mercado Pago error: ${text}` };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        external_reference: externalRef
      })
    };
  } catch (err) {
    console.error('create-preference error:', err);
    return { statusCode: 500, headers: corsHeaders, body: err && err.message ? err.message : 'Internal error' };
  }
};