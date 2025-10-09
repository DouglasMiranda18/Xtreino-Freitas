// Netlify Function: Verificar status do pagamento via API do Mercado Pago
exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { preference_id, external_reference } = JSON.parse(event.body);
        
        if (!preference_id && !external_reference) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'preference_id or external_reference is required' })
            };
        }

        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'MP_ACCESS_TOKEN not configured' })
            };
        }

        // Buscar pagamentos usando a API REST do Mercado Pago
        const searchUrl = `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=2000&external_reference=${external_reference || preference_id}`;
        
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Mercado Pago API error:', errorText);
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({ error: 'Failed to query Mercado Pago API' })
            };
        }

        const searchResult = await response.json();
        console.log('Search result:', JSON.stringify(searchResult, null, 2));

        if (searchResult && searchResult.results && searchResult.results.length > 0) {
            const latestPayment = searchResult.results[0];
            console.log('Latest payment status:', latestPayment.status);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: latestPayment.status,
                    payment_id: latestPayment.id,
                    external_reference: latestPayment.external_reference
                })
            };
        } else {
            // Se não encontrou pagamentos, continuar como pending para manter o polling
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: 'pending',
                    message: 'No payments found for this preference'
                })
            };
        }

    } catch (error) {
        console.error('Error checking payment status:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};