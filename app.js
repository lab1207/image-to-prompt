// app.js (full replace)

const form = document.getElementById('uploadForm');
const output = document.getElementById('output');

// CHANGE THIS to your Netlify site URL if different
const FN_URL = 'https://rococo-pudding-90e3a0.netlify.app/.netlify/functions/analyze';

form.onsubmit = async function(e){
  e.preventDefault();
  output.innerHTML = 'Working...';

  const files = document.getElementById('imageInput').files;
  const target = document.getElementById('targetSelect').value;

  if (!files.length){
    output.innerHTML = 'Please upload at least one image.';
    return;
  }

  const fd = new FormData();
  // send all selected images
  [...files].forEach(f => fd.append('image', f));
  fd.append('target', target);

  try {
    const res = await fetch(FN_URL, { method: 'POST', body: fd });
    const text = await res.text(); // read raw for better error messages

    let data;
    try { data = JSON.parse(text); } catch { data = { prompt: '', code: '', error: text }; }

    if (!res.ok){
      throw new Error(data.error || ('HTTP ' + res.status + ' ' + text));
    }

    output.innerHTML =
      '<b>Prompt:</b><br><textarea rows="10" style="width:100%">'+ (data.prompt || '') +'</textarea>' +
      '<br><b>Code:</b><br><textarea rows="14" style="width:100%">'+ (data.code || '') +'</textarea>';

  } catch (err){
    output.innerHTML = 'Error: ' + err.message;
  }
};
