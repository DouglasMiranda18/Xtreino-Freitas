// Netlify Function: Receber notificações de pagamento do Mercado Pago
const admin = require('firebase-admin');

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
                    
                    // Primeiro, tentar buscar na coleção 'orders' (para compras de tokens)
                    console.log('Searching for order with external_reference:', externalRef);
                    const ordersRef = db.collection('orders');
                    const ordersSnapshot = await ordersRef.where('external_reference', '==', externalRef).get();
                    
                    console.log('Orders found:', ordersSnapshot.size);
                    ordersSnapshot.forEach(doc => {
                        console.log('Order document:', doc.id, doc.data());
                    });
                    
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
                        
                        // Se for compra de tokens, atualizar saldo do usuário
                        console.log('Checking if this is a token purchase...');
                        console.log('Payment description:', payment.description);
                        console.log('Order data:', orderData);
                        
                        if (payment.description && payment.description.includes('Token')) {
                            console.log('This is a token purchase! Processing...');
                            const userId = orderData.userId || orderData.uid;
                            const customerEmail = orderData.customer || orderData.buyerEmail;
                            
                            console.log('User ID:', userId);
                            console.log('Customer Email:', customerEmail);
                            
                            if (userId) {
                                // Buscar usuário por ID
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
                            } else if (customerEmail) {
                                // Buscar usuário por email
                                console.log('Looking up user by email:', customerEmail);
                                const usersSnapshot = await db.collection('users').where('email', '==', customerEmail).get();
                                
                                console.log('Users found by email:', usersSnapshot.size);
                                
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
                            } else {
                                console.log('❌ No userId or customerEmail found in order data');
                            }
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
