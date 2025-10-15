// Netlify Function: Proxy seguro para downloads de produtos
const admin = require('firebase-admin');

// Inicialização do Firebase Admin com diferentes fontes de credencial
try {
  if (!admin.apps.length) {
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (svc) {
      const parsed = JSON.parse(svc);
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Se estiver usando ADC (Application Default Credentials)
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, credential: admin.credential.applicationDefault() });
    } else {
      // Último recurso: tentar inicializar sem credencial (pode falhar localmente)
      admin.initializeApp();
    }
  }
} catch (_) {}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const db = admin.firestore();
    const params = event.queryStringParameters || {};
    const orderId = params.orderId || '';
    const indexStr = params.i;
    const listOnly = params.list === '1';

    if (!orderId) {
      return { statusCode: 400, headers, body: 'Missing orderId' };
    }

    // Buscar entrega digital pelo orderId
    const snapshot = await db
      .collection('digital_deliveries')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { statusCode: 404, headers, body: 'Digital delivery not found' };
    }

    const delivery = snapshot.docs[0].data();
    const links = Array.isArray(delivery.downloadLinks) ? delivery.downloadLinks : [];

    if (listOnly) {
      // Retornar lista de arquivos disponíveis (sem expor URLs reais)
      const list = links.map((l, idx) => ({ index: idx, name: l.name || `file-${idx+1}` }));
      return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ files: list }) };
    }

    const idx = indexStr ? parseInt(indexStr, 10) : 0;
    if (Number.isNaN(idx) || idx < 0 || idx >= links.length) {
      return { statusCode: 400, headers, body: 'Invalid index' };
    }

    const file = links[idx];
    let url = file.url;
    // Tornar relativo ao site, se necessário
    if (url && url.startsWith('/')) {
      const siteBase = process.env.URL || process.env.DEPLOY_PRIME_URL || '';
      url = `${siteBase}${url}`;
    }
    if (!url) {
      return { statusCode: 500, headers, body: 'Missing file URL' };
    }

    // Buscar o arquivo na origem e repassar o conteúdo
    const resp = await fetch(url);
    if (!resp.ok) {
      return { statusCode: resp.status, headers, body: `Upstream error: ${await resp.text()}` };
    }

    const arrayBuf = await resp.arrayBuffer();
    const filenameFromUrl = (() => {
      try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || 'download.bin';
      } catch (_) { return 'download.bin'; }
    })();

    const downloadName = (file.name || filenameFromUrl).replace(/[^a-zA-Z0-9._-]+/g, '_');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`
      },
      body: Buffer.from(arrayBuf).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, headers, body: `Error: ${err.message}` };
  }
};


