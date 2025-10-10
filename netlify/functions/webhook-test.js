// Netlify Function: Testar webhook manualmente
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        console.log('=== WEBHOOK TEST FUNCTION ===');
        console.log('Method:', event.httpMethod);
        console.log('Headers:', JSON.stringify(event.headers, null, 2));
        console.log('Body:', event.body);
        console.log('Query:', event.queryStringParameters);
        
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            console.log('Parsed body:', JSON.stringify(body, null, 2));
            
            // Simular processamento de webhook
            if (body.type === 'payment' && body.data && body.data.id) {
                console.log('Payment notification received:', body.data.id);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        message: 'Webhook test successful',
                        paymentId: body.data.id,
                        type: body.type,
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Webhook test endpoint',
                method: event.httpMethod,
                timestamp: new Date().toISOString(),
                instructions: {
                    webhookUrl: 'https://freitasteste.netlify.app/.netlify/functions/payment-notification',
                    testUrl: 'https://freitasteste.netlify.app/.netlify/functions/webhook-test'
                }
            })
        };
        
    } catch (error) {
        console.error('Webhook test error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                stack: error.stack
            })
        };
    }
};
