// netlify/functions/analyze.js
const Busboy = require('busboy');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Parse multipart with multiple images
function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = []; // { buffer, mime }
    const bb = new Busboy({ headers: event.headers });

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { fields, files } = await parseMultipart(event);
    const target = (fields.target || 'elementor').toLowerCase();

    if (!files.length) return { statusCode: 400, body: 'No images uploaded' };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { statusCode: 500, body: 'Missing GEMINI_API_KEY' };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // image understanding [web:79][web:81]

    // Build parts: instruction + all images
    const parts = [
      { text: [
        'You are a senior UI engineer and brand designer.',
        'Scan ALL images and extract a single unified spec to recreate the same design.',
        'Return:',
        '1) Brand palette as HEX with roles (primary, secondary, bg, text).',
        '2) Typography families and approximate sizes/weights.',
        '3) Layout map: sections in order (hero, features, pricing, testimonials, FAQ, footer) with key copy hints.',
        '4) Components: buttons, cards, nav, forms (styles, radii, shadows).',
        '5) Imagery/illustration style.',
        '6) Accessibility notes (contrast, alt text).',
        'Finally, produce a concise website‑builder prompt to recreate the design exactly.'
      ].join('\n') }
    ];
    for (const f of files) {
      parts.push({ inlineData: { mimeType: f.mime, data: f.buffer.toString('base64') } });
    }

    const resp = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const spec = resp.response.text(); // Detailed analysis/spec [web:79][web:81]

    // Unified builder prompt
    const prompt = [
      'Recreate this website exactly using the following unified design spec.',
      'Implement hero, nav, sections, and footer as described.',
      'Use semantic HTML, mobile‑first CSS, and accessible contrast.',
      '',
      spec
    ].join('\n');

    // Minimal target‑specific starter code (kept lean; user will paste prompt into their AI builder)
    let code = '';
    if (target === 'elementor') {
      code = `<section class="hero">
  <div class="wrap">
    <h1><!-- Headline from spec --></h1>
    <p><!-- Subhead --></p>
    <a class="btn" href="#">Primary CTA</a>
  </div>
</section>
<style>
  :root{
    --brand:#2563eb; /* replace with primary from spec */
    --text:#0f172a;  /* from spec */
    --bg:#f7fbff;    /* from spec */
  }
  .hero{padding:72px 16px;background:var(--bg);color:var(--text)}
  .wrap{max-width:1100px;margin:0 auto;text-align:center}
  .btn{background:var(--brand);color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;display:inline-block}
  @media(min-width:768px){ .hero{padding:100px 24px} }
</style>`;
    } else if (target === 'gutenberg') {
      code = `<section style="padding:72px 16px;background:#f7fbff;color:#0f172a;text-align:center">
  <div style="max-width:1100px;margin:0 auto">
    <h1><!-- Headline --></h1>
    <p><!-- Subhead --></p>
    <a style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none" href="#">Primary CTA</a>
  </div>
</section>`;
    } else if (target === 'raw') {
      code = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Landing</title>
<style>
  :root{--brand:#2563eb;--text:#0f172a;--bg:#f7fbff}
  body{font-family:system-ui,Arial;margin:0;color:var(--text);background:#fff}
  .hero{padding:72px 16px;background:var(--bg);text-align:center}
  .wrap{max-width:1100px;margin:0 auto}
  .btn{background:var(--brand);color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;display:inline-block}
  @media(min-width:768px){ .hero{padding:100px 24px} }
</style></head><body>
<section class="hero"><div class="wrap">
  <h1><!-- Headline --></h1><p><!-- Subhead --></p>
  <a class="btn" href="#">Primary CTA</a>
</div></section>
</body></html>`;
    } else if (target === 'react') {
      code = `export default function Hero(){
  return (<section style={{padding:'72px 16px',background:'#f7fbff',textAlign:'center'}}>
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <h1>{/* Headline */}</h1><p>{/* Subhead */}</p>
      <a style={{background:'#2563eb',color:'#fff',padding:'12px 18px',borderRadius:10,textDecoration:'none'}} href="#">Primary CTA</a>
    </div>
  </section>);
}`;
    } else {
      code = `<div>Unsupported target</div>`;
    }

    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, code }) };
  } catch (e) {
    return { statusCode: 500, body: `Error: ${e.message}` };
  }
};
