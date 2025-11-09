// netlify/functions/analyze.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Simple MVP: read target from JSON body or query
  let target = 'elementor';
  const ct = event.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    const body = JSON.parse(event.body || '{}');
    target = body.target || target;
  } else {
    const params = new URLSearchParams(event.rawQuery || '');
    target = params.get('target') || target;
  }

  const prompt = `Create a clean landing page with hero image, headline, features, testimonials and a bold CTA; modern sans font and blue/white palette. Output for: ${target}.`;

  let code = '';
  if (target === 'elementor') {
    code = `<section class="hero"><h1>Your Headline</h1><p>Short subhead.</p><a class="btn" href="#">Get Started</a></section>
<style>.hero{padding:60px;background:#f7fbff;text-align:center}.btn{background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none}</style>`;
  } else if (target === 'gutenberg') {
    code = `<section style="padding:60px;background:#f7fbff;text-align:center">
<h1>Your Headline</h1><p>Short subhead.</p><a style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none" href="#">Get Started</a>
</section>`;
  } else if (target === 'raw') {
    code = `<!doctype html><html><head><meta charset="utf-8"><title>Landing</title><style>body{font-family:Arial}.hero{padding:60px;background:#f7fbff;text-align:center}.btn{background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none}</style></head><body><section class="hero"><h1>Your Headline</h1><p>Short subhead.</p><a class="btn" href="#">Get Started</a></section></body></html>`;
  } else if (target === 'react') {
    code = `export default function Hero(){return(<section style={{padding:60,background:'#f7fbff',textAlign:'center'}}><h1>Your Headline</h1><p>Short subhead.</p><a style={{background:'#2563eb',color:'#fff',padding:'12px 18px',borderRadius:8,textDecoration:'none'}} href="#">Get Started</a></section>)};`;
  } else {
    code = `<div>Unsupported target</div>`;
  }

  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, code }) };
};
