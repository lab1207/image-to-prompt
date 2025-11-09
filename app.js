// Minimal starter logic
const form = document.getElementById('uploadForm');
const output = document.getElementById('output');
form.onsubmit = async function(e) {
  e.preventDefault();
  output.innerHTML = 'Working...';
  const files = document.getElementById('imageInput').files;
  const target = document.getElementById('targetSelect').value;
  const formData = new FormData();
  for (let f of files) formData.append('images', f);
  formData.append('target', target);
  try {
    // Use your (coming) Netlify Function URL below next!
    const res = await fetch('YOUR_NETLIFY_FN_URL', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    output.innerHTML = '<b>Prompt:</b><br>' +
      `<textarea rows=3 cols=60>${data.prompt}</textarea>` +
      '<br><b>Code:</b><br>' +
      `<textarea rows=10 cols=60>${data.code}</textarea>`;
  } catch (err) {
    output.innerHTML = 'Error: ' + err.message;
  }
}
