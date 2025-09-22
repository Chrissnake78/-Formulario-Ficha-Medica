// ---------- UTILIDADES RUT (Chile) ----------
function cleanRut(v){ return v.replace(/[.\-]/g,'').toUpperCase(); }
function computeDV(cuerpo){
  let suma=0, mul=2;
  for(let i=cuerpo.length-1;i>=0;i--){
    suma += parseInt(cuerpo[i],10)*mul;
    mul = (mul===7)?2:mul+1;
  }
  const res = 11 - (suma % 11);
  if(res===11) return '0';
  if(res===10) return 'K';
  return String(res);
}
function isValidRut(value){
  const v = cleanRut(value);
  if(!/^\d{1,8}[0-9K]$/.test(v)) return false;
  const cuerpo = v.slice(0,-1), dv = v.slice(-1);
  return computeDV(cuerpo) === dv;
}
function formatRut(value){
  const v = cleanRut(value);
  if(v.length<=1) return v;
  const cuerpo = v.slice(0,-1), dv = v.slice(-1);
  let r='', i=0;
  for(let idx=cuerpo.length-1; idx>=0; idx--){
    r = cuerpo[idx] + r;
    i++;
    if(i%3===0 && idx!==0) r = '.' + r;
  }
  return r + '-' + dv;
}

// ---------- HELPERS CSV ----------
function toCSV(arr){
  if(!arr.length) return '';
  const headers = Object.keys(arr[0]);
  const escape = (s)=> {
    if(s===null||s===undefined) return '';
    const str = String(s).replace(/"/g,'""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };
  const lines = [headers.join(',')].concat(arr.map(o => headers.map(h=>escape(o[h])).join(',')));
  return lines.join('\n');
}
function downloadFile(filename, content){
  const blob = new Blob([content], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ---------- STORAGE ----------
const LS_KEY = 'fichas_medicas_v1';
function readAll(){
  return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
}
function writeAll(obj){
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

// ---------- OPERACIONES PRINCIPALES ----------
document.getElementById('btnGuardar').addEventListener('click', guardarRegistro);
document.getElementById('btnBuscar').addEventListener('click', buscarPorApellido);
document.getElementById('btnExportar').addEventListener('click', exportarCSV);
document.getElementById('btnCerrar').addEventListener('click', cerrarFormulario);

// Mantener formateo del RUT mientras escribes
const inputRut = document.getElementById('rut');
inputRut.addEventListener('input', (e)=>{
  const sel = inputRut.selectionStart;
  const prev = inputRut.value.length;
  inputRut.value = formatRut(inputRut.value);
  const delta = inputRut.value.length - prev;
  inputRut.selectionStart = inputRut.selectionEnd = Math.max(0, (sel||0) + delta);
});

function getFormData(){
  return {
    rut: cleanRut(document.getElementById('rut').value),
    nombres: document.getElementById('nombres').value.trim(),
    apellidos: document.getElementById('apellidos').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
    ciudad: document.getElementById('ciudad').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    email: document.getElementById('email').value.trim(),
    fecha: document.getElementById('fecha').value,
    edad: document.getElementById('edad').value.trim(),   // <-- NUEVO
    estadoCivil: document.getElementById('estadoCivil').value,
    comentarios: document.getElementById('comentarios').value.trim(),
    timestamp: new Date().toISOString()
  };
}

function validarFormulario(data){
  if(!data.rut || !data.nombres || !data.apellidos || !data.direccion || !data.ciudad || !data.telefono || !data.email || !data.fecha || !data.estadoCivil){
    alert('Todos los campos obligatorios deben estar completos.');
    return false;
  }
  if(!isValidRut(data.rut)){
    alert('RUT inválido (revisa dígito verificador).');
    return false;
  }
  // Validar teléfono simple Chile: +56 9XXXXXXXX o 9XXXXXXXX
  const tel = data.telefono.replace(/\s+/g,'');
  if(!/^(\+?56)?9\d{8}$/.test(tel)){
    if(!confirm('El teléfono parece inválido. ¿Deseas continuar de todas formas?')) return false;
  }
  // Email simple (HTML ya lo valida, pero por seguridad):
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)){
    if(!confirm('El email parece inválido. ¿Deseas continuar de todas formas?')) return false;
  }
  return true;
}

function guardarRegistro(){
  const data = getFormData();
  if(!validarFormulario(data)) return;

  const registros = readAll();
  if(registros[data.rut]){
    const ok = confirm('El registro con ese RUT ya existe. ¿Deseas sobrescribirlo?');
    if(!ok) return;
  }
  registros[data.rut] = data;
  writeAll(registros);
  alert('Registro guardado con éxito ✅');
  document.getElementById('fichaForm').reset();
  document.getElementById('resultadoBusqueda').innerHTML = '';
}

function buscarPorApellido(){
  const q = document.getElementById('buscarApellido').value.trim().toLowerCase();
  const registros = readAll();
  const resultados = [];
  for(const r in registros){
    if(registros[r].apellidos.toLowerCase().includes(q)){
      resultados.push(registros[r]);
    }
  }
  const cont = document.getElementById('resultadoBusqueda');
  if(!resultados.length){
    cont.innerHTML = '<p>No se encontraron registros.</p>';
    return;
  }
  cont.innerHTML = resultados.map(r => {
  return `<div class="card">
    <strong>${r.nombres} ${r.apellidos}</strong><br>
    RUT: ${r.rut}<br>
    Edad: ${r.edad || 'No registrada'}<br>
    Tel: ${r.telefono} — Email: ${r.email}<br>
    <button class="editar" onclick="cargarRegistro('${r.rut}')">Editar</button>
    <button class="eliminar" onclick="eliminarRegistro('${r.rut}')">Eliminar</button>
  </div>`;
}).join('');
}

function cargarRegistro(rut){
  const registros = readAll();
  const r = registros[rut];
  if(!r){ alert('Registro no encontrado'); return; }
  document.getElementById('rut').value = formatRut(r.rut);
  document.getElementById('nombres').value = r.nombres;
  document.getElementById('apellidos').value = r.apellidos;
  document.getElementById('direccion').value = r.direccion;
  document.getElementById('ciudad').value = r.ciudad;
  document.getElementById('telefono').value = r.telefono;
  document.getElementById('email').value = r.email;
  document.getElementById('fecha').value = r.fecha;
  document.getElementById('edad').value = r.edad;
  document.getElementById('estadoCivil').value = r.estadoCivil;
  document.getElementById('comentarios').value = r.comentarios;
  window.scrollTo(0,0);
}

function eliminarRegistro(rut){
  if(!confirm('¿Eliminar este registro?')) return;
  const registros = readAll();
  delete registros[rut];
  writeAll(registros);
  alert('Registro eliminado.');
  buscarPorApellido();
}

function exportarCSV(){
  const registros = readAll();
  const arr = Object.values(registros).map(r=>{
    // ordenar campos para CSV
    return {
      rut: r.rut,
      nombres: r.nombres,
      apellidos: r.apellidos,
      direccion: r.direccion,
      ciudad: r.ciudad,
      telefono: r.telefono,
      email: r.email,
      fecha: r.fecha,
      edad: r.edad || '',            
      estadoCivil: r.estadoCivil,
      comentarios: r.comentarios,
      timestamp: r.timestamp
    };
  });
  if(!arr.length){ alert('No hay registros para exportar.'); return; }
  const csv = toCSV(arr);
  const date = new Date().toISOString().slice(0,10);
  downloadFile(`fichas_medicas_${date}.csv`, csv);
}

function cerrarFormulario(){
  alert('Si abriste este archivo desde el disco, la ventana no se cerrará por seguridad. Si lo subiste a internet, usa el botón del navegador para cerrar la pestaña.');
  // window.close(); // no fiable desde archivo local
}

// --- Bloque A: fijar max fecha y calcular edad automáticamente ---
const fechaInput = document.getElementById('fecha');
if (fechaInput) {
  // poner límite máximo a hoy
  const hoy = new Date().toISOString().split('T')[0];
  fechaInput.setAttribute('max', hoy);

  function calcularEdadDesdeFecha(fechaISO) {
    if (!fechaISO) return '';
    const hoy = new Date();
    const fn = new Date(fechaISO);
    let edad = hoy.getFullYear() - fn.getFullYear();
    const m = hoy.getMonth() - fn.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--;
    return String(edad);
  }

  // cuando cambias fecha, calcula edad automáticamente
  fechaInput.addEventListener('change', () => {
    const v = fechaInput.value;
    const edadInput = document.getElementById('edad');
    if (edadInput) edadInput.value = calcularEdadDesdeFecha(v);
  });
}

// --- Bloque B: validaciones teléfono/email ---
function validarTelefono(tel){
  if(!tel) return false;
  const num = tel.replace(/\s+/g,'').replace(/\+/g,'');
  return /^(\+?56)?9\d{8}$/.test(num);
}
function validarEmail(email){
  if(!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Bloque C: exponer utilidades y precarga de prueba (para facilitar ejecución y evidencias) ---
window.readAll = readAll;
window.writeAll = writeAll;
window.buscarPorApellido = buscarPorApellido;
window.cargarRegistro = cargarRegistro;
window.eliminarRegistro = eliminarRegistro;

window.precargarRegistrosDePrueba = function(){
  const r = {
    '11111111-1': {rut:'11111111-1', nombres:'Ana', apellidos:'Perez', edad:'30', telefono:'+56912345678', email:'ana@correo.cl', fecha:'1995-01-01', direccion:'Calle A 123', ciudad:'Santiago', estadoCivil:'Soltero/a', comentarios:'test'},
    '22222222-2': {rut:'22222222-2', nombres:'Luis', apellidos:'Gomez', edad:'45', telefono:'+56987654321', email:'luis@correo.cl', fecha:'1980-02-02', direccion:'Calle B 456', ciudad:'Valparaiso', estadoCivil:'Casado/a', comentarios:'test'},
    '33333333-3': {rut:'33333333-3', nombres:'Carla', apellidos:'Diaz', edad:'28', telefono:'+56911223344', email:'carla@correo.cl', fecha:'1997-03-03', direccion:'Calle C 789', ciudad:'Concepcion', estadoCivil:'Soltero/a', comentarios:'test'}
  };
  writeAll(r);
  console.info('Registros de prueba cargados');
};