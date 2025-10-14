// Netlify Function: Receber notificações de pagamento do Mercado Pago
const admin = require('firebase-admin');

// Função para gerar links de download baseado no produto
function generateDownloadLinks(productId, productOptions = {}) {
    const baseUrl = 'https://freitasteste.netlify.app/downloads/';
    
    switch (productId) {
        case 'sensibilidades':
            return [
                {
                    name: 'Sensibilidade PC',
                    url: `${baseUrl}sensibilidade-pc.zip`,
                    description: 'Arquivo de configuração para PC'
                },
                {
                    name: 'Sensibilidade Mobile',
                    url: `${baseUrl}sensibilidade-mobile.zip`,
                    description: 'Arquivo de configuração para Android/iOS'
                },
                {
                    name: 'Guia de Instalação',
                    url: `${baseUrl}guia-sensibilidade.pdf`,
                    description: 'Instruções passo a passo'
                }
            ];
            
        case 'imagens':
            const maps = productOptions.maps || [];
            return maps.map(map => ({
                name: `Imagens Aéreas - ${map}`,
                url: `${baseUrl}imagens-${map.toLowerCase().replace(' ', '-')}.zip`,
                description: `~20 imagens com principais calls do mapa ${map}`
            }));
            
        case 'planilhas':
            return [
                {
                    name: 'Planilhas de Análise',
                    url: `${baseUrl}planilhas-analise.xlsx`,
                    description: 'Planilhas para coachs e analistas'
                },
                {
                    name: 'Vídeo Explicativo',
                    url: `${baseUrl}video-explicativo.mp4`,
                    description: 'Tutorial de uso das planilhas'
                }
            ];
            
        case 'passe-booyah':
            return [
                {
                    name: 'Instruções de Ativação',
                    url: `${baseUrl}instrucoes-passe.pdf`,
                    description: 'Como ativar o passe Booyah'
                }
            ];
            
        case 'camisa':
            return [
                {
                    name: 'Comprovante de Compra',
                    url: `${baseUrl}comprovante-camisa.pdf`,
                    description: 'Comprovante para retirada da camisa'
                }
            ];
            
        default:
            return [
                {
                    name: 'Produto Digital',
                    url: `${baseUrl}produto-${productId}.zip`,
                    description: 'Arquivo do produto comprado'
                }
            ];
    }
}

// Inicializar Firebase Admin se ainda não foi inicializado
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
}

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
        const { type, data } = JSON.parse(event.body);
        
        console.log('=== PAYMENT NOTIFICATION RECEIVED ===');
        console.log('Type:', type);
        console.log('Data:', JSON.stringify(data, null, 2));
        console.log('Full body:', event.body);

        if (type === 'payment') {
            const paymentId = data.id;
            console.log('Processing payment ID:', paymentId);
            
            // Buscar detalhes do pagamento
            const accessToken = process.env.MP_ACCESS_TOKEN;
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment details');
            }

            const payment = await response.json();
            console.log('Payment details:', {
                id: payment.id,
                status: payment.status,
                external_reference: payment.external_reference,
                description: payment.description
            });

            // Se o pagamento foi aprovado, atualizar o Firestore
            if (payment.status === 'approved') {
                console.log('Payment approved, updating database...');
                
                try {
                    const db = admin.firestore();
                    const externalRef = payment.external_reference;
                    
                    // Primeiro, tentar buscar na coleção 'orders' (para compras de tokens e produtos)
                    console.log('Searching for order with external_reference:', externalRef);
                    const ordersRef = db.collection('orders');
                    const ordersSnapshot = await ordersRef.where('external_reference', '==', externalRef).get();
                    
                    console.log('Orders found:', ordersSnapshot.size);
                    ordersSnapshot.forEach(doc => {
                        console.log('Order document:', doc.id, doc.data());
                    });
                    
                    // Se não encontrou, tentar buscar por ID do documento (caso o external_reference seja digital_<docId>)
                    if (ordersSnapshot.empty && externalRef.startsWith('digital_')) {
                        const docId = externalRef.replace('digital_', '');
                        console.log('Trying to find order by document ID:', docId);
                        const orderDoc = await ordersRef.doc(docId).get();
                        if (orderDoc.exists) {
                            console.log('Found order by document ID:', docId);
                            // Atualizar o external_reference no documento
                            await orderDoc.ref.update({ external_reference: externalRef });
                            // Usar o documento encontrado
                            const orderData = orderDoc.data();
                            const orderDocRef = orderDoc.ref;
                            
                            // Atualizar status para 'paid'
                            await orderDocRef.update({
                                status: 'paid',
                                paymentId: payment.id,
                                paymentStatus: 'approved',
                                paidAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                            
                            console.log('Order updated to paid:', orderDoc.id);
                            
                            // Processar o tipo de compra
                            if (payment.description && payment.description.includes('Token')) {
                                console.log('This is a token purchase! Processing...');
                                const userId = orderData.userId || orderData.uid;
                                const customerEmail = orderData.customer || orderData.buyerEmail;
                                
                                if (customerEmail) {
                                    console.log('Looking up user by email:', customerEmail);
                                    const usersSnapshot = await db.collection('users').where('email', '==', customerEmail).get();
                                    
                                    if (!usersSnapshot.empty) {
                                        const userDoc = usersSnapshot.docs[0];
                                        const currentTokens = userDoc.data().tokens || 0;
                                        const tokensToAdd = parseInt(payment.description.match(/\d+/)?.[0] || '1');
                                        
                                        await userDoc.ref.update({
                                            tokens: currentTokens + tokensToAdd
                                        });
                                        
                                        console.log(`✅ Added ${tokensToAdd} tokens to user ${customerEmail}. New balance: ${currentTokens + tokensToAdd}`);
                                    }
                                }
                            } else if (orderData.type === 'digital_product') {
                                console.log('This is a digital product purchase! Processing delivery...');
                                
                                const deliveryData = {
                                    orderId: orderDoc.id,
                                    customerEmail: orderData.customer || orderData.buyerEmail,
                                    customerName: orderData.customerName,
                                    productId: orderData.productId,
                                    productName: orderData.title,
                                    productOptions: orderData.productOptions || {},
                                    status: 'delivered',
                                    deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
                                    downloadLinks: generateDownloadLinks(orderData.productId, orderData.productOptions),
                                    paymentId: payment.id
                                };
                                
                                await db.collection('digital_deliveries').add(deliveryData);
                                console.log('✅ Digital delivery created for product:', orderData.productId);
                            }
                            
                            return {
                                statusCode: 200,
                                headers,
                                body: JSON.stringify({ received: true, status: payment.status })
                            };
                        }
                    }
                    
                    if (!ordersSnapshot.empty) {
                        const orderDoc = ordersSnapshot.docs[0];
                        const orderData = orderDoc.data();
                        
                        // Atualizar status para 'paid'
                        await orderDoc.ref.update({
                            status: 'paid',
                            paymentId: payment.id,
                            paymentStatus: 'approved',
                            paidAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        
                        console.log('Order updated to paid:', orderDoc.id);
                        
                        // Verificar tipo de compra
                        console.log('Checking purchase type...');
                        console.log('Payment description:', payment.description);
                        console.log('Order data:', orderData);
                        
                        // Se for compra de tokens, atualizar saldo do usuário
                        if (payment.description && payment.description.includes('Token')) {
                            console.log('This is a token purchase! Processing...');
                            const userId = orderData.userId || orderData.uid;
                            const customerEmail = orderData.customer || orderData.buyerEmail;
                            
                            console.log('User ID:', userId);
                            console.log('Customer Email:', customerEmail);
                            
                            // Primeiro tentar por email (mais confiável)
                            if (customerEmail) {
                                console.log('Looking up user by email:', customerEmail);
                                const usersSnapshot = await db.collection('users').where('email', '==', customerEmail).get();
                                
                                if (!usersSnapshot.empty) {
                                    const userDoc = usersSnapshot.docs[0];
                                    const currentTokens = userDoc.data().tokens || 0;
                                    const tokensToAdd = parseInt(payment.description.match(/\d+/)?.[0] || '1');
                                    
                                    console.log(`Current tokens: ${currentTokens}, Adding: ${tokensToAdd}`);
                                    
                                    await userDoc.ref.update({
                                        tokens: currentTokens + tokensToAdd
                                    });
                                    
                                    console.log(`✅ Added ${tokensToAdd} tokens to user ${customerEmail}. New balance: ${currentTokens + tokensToAdd}`);
                                } else {
                                    console.log('❌ No user found with email:', customerEmail);
                                }
                            } else if (userId) {
                                // Fallback: buscar usuário por ID
                                console.log('Looking up user by ID:', userId);
                                const userRef = db.collection('users').doc(userId);
                                const userDoc = await userRef.get();
                                
                                if (userDoc.exists) {
                                    const currentTokens = userDoc.data().tokens || 0;
                                    const tokensToAdd = parseInt(payment.description.match(/\d+/)?.[0] || '1');
                                    
                                    console.log(`Current tokens: ${currentTokens}, Adding: ${tokensToAdd}`);
                                    
                                    await userRef.update({
                                        tokens: currentTokens + tokensToAdd
                                    });
                                    
                                    console.log(`✅ Added ${tokensToAdd} tokens to user ${userId}. New balance: ${currentTokens + tokensToAdd}`);
                                } else {
                                    console.log('❌ User document not found for ID:', userId);
                                }
                            } else {
                                console.log('❌ No user ID or email found in order data');
                            }
                        }
                        
                        // Se for produto digital, criar entrega digital
                        else if (orderData.type === 'digital_product') {
                            console.log('This is a digital product purchase! Processing delivery...');
                            
                            // Criar entrega digital
                            const deliveryData = {
                                orderId: orderDoc.id,
                                customerEmail: orderData.customer || orderData.buyerEmail,
                                customerName: orderData.customerName,
                                productId: orderData.productId,
                                productName: orderData.title,
                                productOptions: orderData.productOptions || {},
                                status: 'delivered',
                                deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
                                downloadLinks: generateDownloadLinks(orderData.productId, orderData.productOptions),
                                paymentId: payment.id
                            };
                            
                            console.log('Creating digital delivery:', deliveryData);
                            
                            // Salvar entrega digital
                            await db.collection('digital_deliveries').add(deliveryData);
                            
                            console.log('✅ Digital delivery created for product:', orderData.productId);
                        }
                    } else {
                        // Se não encontrou em orders, tentar em registrations (para agendamentos)
                        const registrationsRef = db.collection('registrations');
                        const registrationsSnapshot = await registrationsRef.where('external_reference', '==', externalRef).get();
                        
                        if (!registrationsSnapshot.empty) {
                            const registrationDoc = registrationsSnapshot.docs[0];
                            
                            // Atualizar status para 'paid'
                            await registrationDoc.ref.update({
                                status: 'paid',
                                paymentId: payment.id,
                                paymentStatus: 'approved',
                                paidAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                            
                            console.log('Registration updated to paid:', registrationDoc.id);
                        } else {
                            console.log('❌ No order or registration found for external_reference:', externalRef);
                        }
                    }
                } catch (firebaseError) {
                    console.error('❌ Firebase update error:', firebaseError);
                    // Não falhar a notificação por causa de erro no Firebase
                }
                
                console.log('=== PAYMENT PROCESSING COMPLETED ===');
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ received: true, status: payment.status })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ received: true, type })
        };

    } catch (error) {
        console.error('Error processing payment notification:', error);
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
