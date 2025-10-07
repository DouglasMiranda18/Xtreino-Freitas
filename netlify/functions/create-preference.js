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

    const preferencePayload = {
      items: [
        {
          title,
          quantity,
          currency_id,
          unit_price: Number(unit_price)
        }
      ],
      back_urls: {
        success: process.env.MP_BACK_URL_SUCCESS || 'https://example.com/sucesso',
        failure: process.env.MP_BACK_URL_FAILURE || 'https://example.com/falha',
        pending: process.env.MP_BACK_URL_PENDING || 'https://example.com/pendente'
      },
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
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id, init_point: data.init_point, sandbox_init_point: data.sandbox_init_point })
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: err && err.message ? err.message : 'Internal error' };
  }
}


