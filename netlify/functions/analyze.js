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
// ... keep your parseMultipart(event) code above ...

// Minimal handler with image parsing + target reading
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { fields, files } = await parseMultipart(event);
    const target = (fields.target || 'elementor').toLowerCase();

    // For now, just confirm we received files; plug in Gemini later
    const imgCount = files.length;

    const prompt = `Received ${imgCount} image(s). Create a landing page with hero, features, testimonials and CTA. Output for: ${target}.`;
    let code = '';

    if (target === 'elementor') {
      code = `<section class="hero"><h1>Your Headline</h1><p>Subhead</p><a class="btn" href="#">Get Started</a></section>
<style>.hero{padding:60px;background:#f7fbff;text-align:center}.btn{background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none}</style>`;
    } else if (target === 'gutenberg') {
      code = `<section style="padding:60px;background:#f7fbff;text-align:center"><h1>Your Headline</h1><p>Subhead</p><a style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none" href="#">Get Started</a></section>`;
    } else if (target === 'raw') {
      code = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial}.hero{padding:60px;background:#f7fbff;text-align:center}.btn{background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none}</style></head><body><section class="hero"><h1>Your Headline</h1><p>Subhead</p><a class="btn" href="#">Get Started</a></section></body></html>`;
    } else if (target === 'react') {
      code = `export default function Hero(){return(<section style={{padding:60,background:'#f7fbff',textAlign:'center'}}><h1>Your Headline</h1><p>Subhead</p><a style={{background:'#2563eb',color:'#fff',padding:'12px 18px',borderRadius:8,textDecoration:'none'}} href="#">Get Started</a></section>)}`;
    } else {
      code = `<div>Unsupported target</div>`;
    }

    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, code }) };
  } catch (e) {
    return { statusCode: 500, body: `Error: ${e.message}` };
  }
};
