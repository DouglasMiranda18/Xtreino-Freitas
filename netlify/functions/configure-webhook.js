// Netlify Function: Configurar webhook do Mercado Pago - Versão simplificada
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
        const accessToken = process.env.MP_ACCESS_TOKEN;
        const webhookUrl = 'https://freitasteste.netlify.app/.netlify/functions/payment-notification';
        
        if (!accessToken) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    error: 'MP_ACCESS_TOKEN não configurado',
                    status: 'Falha'
                })
            };
        }

        // Configurar webhook via API
        const webhookPayload = {
            url: webhookUrl,
            events: ['payment'],
            version: 'v1'
        };

        console.log('Tentando configurar webhook:', webhookPayload);

        const response = await fetch('https://api.mercadopago.com/v1/webhooks', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
        });

        const responseText = await response.text();
        console.log('Resposta do Mercado Pago:', responseText);

        if (!response.ok) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    error: 'Falha ao configurar webhook',
                    status: 'Erro',
                    details: responseText,
                    statusCode: response.status
                })
            };
        }

        const webhookData = JSON.parse(responseText);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Webhook configurado com sucesso!',
                webhook: webhookData,
                url: webhookUrl
            })
        };

    } catch (error) {
        console.error('Erro:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                error: 'Erro interno',
                message: error.message,
                status: 'Falha'
            })
        };
    }
};
