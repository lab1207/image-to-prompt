form.onsubmit = async function(e){
  e.preventDefault();
  output.innerHTML = 'Working...';
  const files = document.getElementById('imageInput').files;
  const target = document.getElementById('targetSelect').value;
  if (!files.length) { output.innerHTML = 'Please upload at least one image.'; return; }
  const fd = new FormData();
  // append each file with the same field name "image"
  [...files].forEach(f => fd.append('image', f));
  fd.append('target', target);
  try{
    const res = await fetch('https://rococo-pudding-90e3a0.netlify.app/.netlify/functions/analyze', { method:'POST', body: fd });
    const data = await res.json();
    output.innerHTML = '<b>Prompt:</b><br><textarea rows=10>'+data.prompt+'</textarea><br><b>Code:</b><br><textarea rows=14>'+data.code+'</textarea>';
  }catch(err){
    output.innerHTML = 'Error: ' + err.message;
  }
};
