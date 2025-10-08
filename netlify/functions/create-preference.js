// Netlify Function: Create Mercado Pago Preference
// Env var required: MP_ACCESS_TOKEN

// CORS helpers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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
    const { title, quantity = 1, currency_id = 'BRL', unit_price } = body;

    if (!title || typeof unit_price === 'undefined') {
      return { statusCode: 400, headers: corsHeaders, body: 'Invalid payload' };
    }

    const siteUrl = process.env.MP_BACK_BASE_URL || process.env.SITE_URL || process.env.URL || (event && event.headers && event.headers.host ? (`https://${event.headers.host}`) : null);
    const successUrl = (process.env.MP_BACK_URL_SUCCESS || (siteUrl ? `${siteUrl}/?mp_status=success` : 'https://example.com/sucesso'));
    const failureUrl = (process.env.MP_BACK_URL_FAILURE || (siteUrl ? `${siteUrl}/?mp_status=failure` : 'https://example.com/falha'));
    const pendingUrl = (process.env.MP_BACK_URL_PENDING || (siteUrl ? `${siteUrl}/?mp_status=pending` : 'https://example.com/pendente'));

    const preferencePayload = {
      items: [
        {
          title,
          quantity,
          currency_id,
          unit_price: Number(unit_price)
        }
      ],
      back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
      auto_return: 'approved'
    };

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
    // Em produção, use init_point; sandbox_init_point é retornado apenas para contas sandbox
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id, init_point: data.init_point, sandbox_init_point: data.sandbox_init_point })
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: err && err.message ? err.message : 'Internal error' };
  }
}


