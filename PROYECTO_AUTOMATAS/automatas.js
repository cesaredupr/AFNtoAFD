let Q = []; // Estados
let S = []; // Alfabeto
let A = []; // Estados de aceptación
let W = []; // Transiciones
let estadoInicial = '';

const areaCargarArchivo = document.getElementById('areaCargarArchivo');
const contenidoArchivo = document.getElementById('contenidoArchivo');
const tablaVectores = document.getElementById('tablaVectores').getElementsByTagName('tbody')[0];
const matrizTransiciones = document.getElementById('matrizTransiciones').getElementsByTagName('tbody')[0];
const encabezadoTransiciones = document.getElementById('encabezadoTransiciones');
const matrizAFD = document.getElementById('matrizAFD').getElementsByTagName('tbody')[0];
const encabezadoAFD = document.getElementById('encabezadoAFD');

areaCargarArchivo.addEventListener('dragover', (e) => {
    e.preventDefault();
    areaCargarArchivo.classList.add('dragover');
});

areaCargarArchivo.addEventListener('dragleave', () => {
    areaCargarArchivo.classList.remove('dragover');
});

areaCargarArchivo.addEventListener('drop', (e) => {
    e.preventDefault();
    areaCargarArchivo.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
        leerArchivo(file);
    } else {
        alert('Por favor, arrastra un archivo de texto (.txt).');
    }
});

areaCargarArchivo.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'text/plain') {
            leerArchivo(file);
        }
    };
    input.click();
});

function leerArchivo(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const text = reader.result;
        contenidoArchivo.textContent = text;
        procesarArchivo(text);
    };
    reader.readAsText(file);
}

function procesarArchivo(texto) {
    const lineas = texto.split(/\r?\n/);
    lineas.forEach(linea => {
        if (linea.startsWith('Q')) {
            Q = extraerDatosLLaves(linea);
        } else if (linea.startsWith('Z')) {
            S = extraerDatosLLaves(linea);
        } else if (linea.startsWith('A')) {
            A = extraerDatosLLaves(linea);
        } else if (linea.startsWith('i')) {
            estadoInicial = linea.substring(2).trim();
        } else if (linea.startsWith('W')) {
            W = extraerTransiciones(linea);
        }
    });

    mostrarVectores();
    mostrarMatrizDeTransiciones();
    const afd = convertirAFNaAFD(); // Convertir a AFD
    mostrarInformacionAFD(afd); // Mostrar la información del AFD
    mostrarMatrizAFD(afd); // Mostrar el AFD

    
    document.querySelector('.vectores tbody').style.display = 'table-row-group';

    ajustarAnchoColumnasDinamicamente(); // Ajustar el ancho dinámicamente
}

function extraerDatosLLaves(linea) {
    const match = linea.match(/\{([^}]*)\}/);
    return match ? match[1].split(',').map(val => val.trim()) : [];
}

function extraerTransiciones(linea) {
    const match = linea.match(/W=\{([^}]*)\}/);
    const transiciones = match ? match[1].split(';') : [];
    return transiciones.map(trans => {
        const matchTrans = trans.match(/\(([^,]+),([^,]+),([^,]+)\)/);
        if (matchTrans) {
            return {
                estado: matchTrans[1].trim(),
                simbolo: matchTrans[2].trim(),
                destino: matchTrans[3].trim()
            };
        }
        return null;
    }).filter(Boolean);
}

function mostrarVectores() {
    tablaVectores.innerHTML = '';  // Limpiar tabla
    Q.forEach((estado, index) => {
        const row = document.createElement('tr');
        const cellQ = document.createElement('td');
        const cellSigma = document.createElement('td');
        const cellA = document.createElement('td');

        cellQ.textContent = estado;
        cellSigma.textContent = S[index] || ''; 
        cellA.textContent = A.includes(estado) ? estado : ''; // Solo si es estado de aceptación

        row.appendChild(cellQ);
        row.appendChild(cellSigma);
        row.appendChild(cellA);
        tablaVectores.appendChild(row);
    });
}

function mostrarMatrizDeTransiciones() {
    matrizTransiciones.innerHTML = ''; // Limpiar matriz
    encabezadoTransiciones.innerHTML = '<th>Estado</th>'; 

    S.forEach(simbolo => {
        const th = document.createElement('th');
        th.textContent = simbolo;
        encabezadoTransiciones.appendChild(th);
    });

    Q.forEach(estado => {
        const row = document.createElement('tr');
        const estadoCell = document.createElement('td');
        estadoCell.textContent = estado;
        row.appendChild(estadoCell);

        S.forEach(simbolo => {
            const cell = document.createElement('td');
            const trans = W.find(t => t.estado === estado && t.simbolo === simbolo);
            cell.textContent = trans ? trans.destino : ' '; // Usar Ø para transiciones vacías
            row.appendChild(cell);
        });

        matrizTransiciones.appendChild(row);
    });
}

function convertirAFNaAFD() {
    const afd = {
        estados: [],
        alfabeto: S.filter(symbol => symbol !== 'e'), // Excluir epsilon del alfabeto
        transiciones: {},
        estadoInicial: obtenerCerraduraEpsilon([estadoInicial]), 
        estadosAceptacion: [] // Lista de estados de aceptación
    };

    let nuevosEstados = [afd.estadoInicial]; // Lista de estados por procesar
    let procesados = new Set(); // Estados ya procesados
    let contadorEstados = 0; 
    let mapaEstados = {}; // Mapeo de conjuntos de estados a letras 

    
    let estadoTrampa = null;
    let nombreEstadoTrampa = 'C'; 

    
    function obtenerNombreEstado() {
        return String.fromCharCode(65 + contadorEstados++); // A, B, C, etc.
    }

    
    function obtenerEstadoTrampa() {
        if (!estadoTrampa) {
            estadoTrampa = {
                nombre: nombreEstadoTrampa,
                composicion: [] 
            };
            afd.estados.push(estadoTrampa);
            afd.transiciones[nombreEstadoTrampa] = {};
            afd.alfabeto.forEach(simbolo => {
                afd.transiciones[nombreEstadoTrampa][simbolo] = nombreEstadoTrampa; 
            });
        }
        return estadoTrampa.nombre;
    }

    
    let nombreEstadoInicial = obtenerNombreEstado();
    mapaEstados[`{${afd.estadoInicial.join(',')}}`] = nombreEstadoInicial;

    while (nuevosEstados.length > 0) {
        const estadoActual = nuevosEstados.shift(); // Tomar el siguiente estado a procesar
        const estadoNombre = `{${estadoActual.join(',')}}`;

        if (procesados.has(estadoNombre)) continue; // Si ya fue procesado, se ignora
        procesados.add(estadoNombre); // Marcar como procesado

        const nombreEstado = mapaEstados[estadoNombre] || obtenerNombreEstado();
        mapaEstados[estadoNombre] = nombreEstado;

        afd.estados.push({
            nombre: nombreEstado,
            composicion: estadoActual
        });

        afd.transiciones[nombreEstado] = {};

        afd.alfabeto.forEach(simbolo => {
            const nuevosDestinos = moverConSimbolo(estadoActual, simbolo);

           
            if (nuevosDestinos.length === 0) {
                afd.transiciones[nombreEstado][simbolo] = obtenerEstadoTrampa();
            } else {
                const nuevoEstado = obtenerCerraduraEpsilon(nuevosDestinos);
                const nuevoEstadoNombre = `{${nuevoEstado.join(',')}}`;

                
                if (nuevoEstadoNombre === '{}') {
                    afd.transiciones[nombreEstado][simbolo] = obtenerEstadoTrampa();
                } else {
                    const nombreNuevoEstado = mapaEstados[nuevoEstadoNombre] || obtenerNombreEstado();
                    mapaEstados[nuevoEstadoNombre] = nombreNuevoEstado;
                    afd.transiciones[nombreEstado][simbolo] = nombreNuevoEstado;

                    if (!procesados.has(nuevoEstadoNombre)) {
                        nuevosEstados.push(nuevoEstado); // Añadir el nuevo estado para procesar
                    }
                }
            }
        });

        
        if (estadoActual.some(estado => A.includes(estado))) {
            afd.estadosAceptacion.push(nombreEstado);
        }
    }

    return afd;
}

// Función para obtener la cerradura epsilon de un conjunto de estados
function obtenerCerraduraEpsilon(estados) {
    let cerradura = [...estados]; 
    let stack = [...estados]; // Se utiliza una pila para procesar cada estado

    while (stack.length > 0) {
        const estado = stack.pop();
        W.forEach(trans => {
            if (trans.estado === estado && trans.simbolo === 'e' && !cerradura.includes(trans.destino)) {
                cerradura.push(trans.destino); 
                stack.push(trans.destino);
            }
        });
    }

    return cerradura;
}


function moverConSimbolo(estados, simbolo) {
    let nuevosEstados = [];
    estados.forEach(estado => {
        W.forEach(trans => {
            if (trans.estado === estado && trans.simbolo === simbolo) {
                nuevosEstados.push(trans.destino); 
            }
        });
    });
    return nuevosEstados;
}


function mostrarMatrizAFD(afd) {
    matrizAFD.innerHTML = ''; 
    encabezadoAFD.innerHTML = '<th>Estado</th><th>a</th><th>b</th><th>Composición</th>'; 

    const estadosMostrados = new Set(); 

    
    const estadosOrdenados = afd.estados.sort((a, b) => a.nombre.localeCompare(b.nombre));

    estadosOrdenados.forEach(({ nombre, composicion }) => {
        if (!estadosMostrados.has(nombre)) { 
            estadosMostrados.add(nombre); 

            const row = document.createElement('tr');
            
            
            const estadoCell = document.createElement('td');
            estadoCell.textContent = nombre;
            row.appendChild(estadoCell);
    
            
            ['a', 'b'].forEach(simbolo => {
                const cell = document.createElement('td');
                cell.textContent = afd.transiciones[nombre][simbolo] || 'Ø';
                row.appendChild(cell);
            });
    
            
            const composicionCell = document.createElement('td');
            composicionCell.textContent = composicion.length ? composicion.join(',') : 'Ø';
            row.appendChild(composicionCell);
    
            
            matrizAFD.appendChild(row);
        }
    });
}


function mostrarInformacionAFD(afd) {
    const infoAFD = document.getElementById('infoAFD');
    const estados = `Q={${afd.estados.map(e => e.nombre).join(',')}}`;
    const alfabeto = `Z={${afd.alfabeto.join(',')}}`;
    const estadoInicial = `i: ${afd.estados[0].nombre}`; 
    const estadosAceptacion = `A={${afd.estadosAceptacion.join(',')}}`;

    
    infoAFD.textContent = `${estados}\n${alfabeto}\n${estadoInicial}\n${estadosAceptacion}`;
}

