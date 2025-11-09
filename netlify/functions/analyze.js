// netlify/functions/analyze.js

const busboy = require('busboy'); // keep require
// When instantiating, use: busboy({ headers: event.headers })

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    let bb;

    try {
      // Use function call, not `new Busboy(...)`
      bb = busboy({ headers: event.headers });
    } catch (e) {
      return reject(e);
    }

    bb.on('file', (name, stream, filename, encoding, mime) => {
      let buf = Buffer.alloc(0);
      stream.on('data', d => { buf = Buffer.concat([buf, d]); });
      stream.on('end', () => files.push({ buffer: buf, mime: mime || 'image/jpeg' }));
      stream.on('limit', () => reject(new Error('File too large')));
    });

    bb.on('field', (name, val) => (fields[name] = val));
    bb.on('finish', () => resolve({ fields, files }));
    bb.on('error', reject);

    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '');
    bb.end(body);
  });
}
