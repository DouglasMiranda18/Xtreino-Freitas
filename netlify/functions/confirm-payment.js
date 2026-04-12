const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK usando a variável de ambiente
let db;
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount) {
    throw new Error('Variável FIREBASE_SERVICE_ACCOUNT_KEY não definida');
  }
  const serviceAccountObj = JSON.parse(serviceAccount);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountObj)
  });
  db = admin.firestore();
  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  console.error('❌ Erro fatal ao inicializar Firebase Admin:', error);
  // A função retornará erro para qualquer chamada
  module.exports.handler = async () => ({
    statusCode: 500,
    body: JSON.stringify({ error: 'Configuração do servidor inválida' })
  });
  return;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { externalRef, regIds } = JSON.parse(event.body);
    if (!externalRef && (!regIds || !regIds.length)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing externalRef or regIds' }) };
    }

    console.log(`🔄 Confirmando pagamento para externalRef: ${externalRef}, regIds: ${regIds}`);

    let registrationsToUpdate = [];

    if (regIds && regIds.length) {
      // Atualizar por ID (mais seguro e evita consultas)
      for (const id of regIds) {
        const docRef = db.collection('registrations').doc(id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          registrationsToUpdate.push({ ref: docRef, data: docSnap.data() });
        } else {
          console.warn(`Documento ${id} não encontrado`);
        }
      }
    } else if (externalRef) {
      // Fallback: buscar por external_reference
      const snapshot = await db.collection('registrations')
        .where('external_reference', '==', externalRef)
        .get();
      snapshot.forEach(doc => {
        registrationsToUpdate.push({ ref: doc.ref, data: doc.data() });
      });
    }

    if (registrationsToUpdate.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Nenhuma reserva encontrada' }) };
    }

    // Atualizar todas as registrations em lote
    const batch = db.batch();
    let groupLink = null;
    registrationsToUpdate.forEach(item => {
      batch.update(item.ref, { status: 'paid', paidAt: admin.firestore.FieldValue.serverTimestamp() });
      if (!groupLink && item.data.groupLink) groupLink = item.data.groupLink;
    });
    await batch.commit();

    // Garantir que exista um pedido em orders
    const firstReg = registrationsToUpdate[0].data;
    const externalRefToUse = externalRef || firstReg.external_reference;
    const ordersSnapshot = await db.collection('orders')
      .where('external_reference', '==', externalRefToUse)
      .get();

    if (ordersSnapshot.empty) {
      await db.collection('orders').add({
        title: firstReg.title || firstReg.eventType || 'Evento',
        description: firstReg.title || firstReg.eventType || 'Evento',
        item: firstReg.title || firstReg.eventType || 'Evento',
        amount: firstReg.price || 0,
        total: firstReg.price || 0,
        quantity: 1,
        currency: 'BRL',
        status: 'paid',
        customer: firstReg.email || firstReg.contact || '',
        customerName: firstReg.teamName || '',
        buyerEmail: firstReg.email || '',
        userId: firstReg.userId || null,
        uid: firstReg.userId || null,
        external_reference: externalRefToUse,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: Date.now(),
        type: 'event'
      });
    } else {
      const existingOrder = ordersSnapshot.docs[0];
      if (existingOrder.data().status !== 'paid') {
        await existingOrder.ref.update({ status: 'paid', paidAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, groupLink })
    };
  } catch (error) {
    console.error('❌ Erro ao confirmar pagamento:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};