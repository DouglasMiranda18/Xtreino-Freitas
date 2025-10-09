const { MercadoPagoConfig, Payment } = require('mercadopago');

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

        // Configurar Mercado Pago
        const client = new MercadoPagoConfig({
            accessToken: process.env.MP_ACCESS_TOKEN,
            options: { timeout: 5000 }
        });

        const payment = new Payment(client);

        // Buscar pagamentos relacionados à preferência ou external_reference
        const searchParams = {
            qs: {
                'external_reference': external_reference || preference_id
            }
        };

        const searchResult = await payment.search(searchParams);
        
        console.log('Search result:', JSON.stringify(searchResult, null, 2));

        if (searchResult.results && searchResult.results.length > 0) {
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
            // Se não encontrou pagamentos, pode estar pendente
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
