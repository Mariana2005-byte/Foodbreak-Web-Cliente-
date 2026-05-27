import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBVMweWkY-0yj7UIPgxliUPlQTTNmeDmWU",
  authDomain: "foodbreak-bfbcb.firebaseapp.com",
  projectId: "foodbreak-bfbcb",
  storageBucket: "foodbreak-bfbcb.firebasestorage.app",
  messagingSenderId: "628379594863",
  appId: "1:628379594863:web:e528f605e6d952cadf5d9a",
  databaseURL: "https://foodbreak-bfbcb-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let productos = [];
let carrito = [];
let usuarioLogueado = null;
let listaFoliosSesion = []; 

let miMapa;
let miMarcador;

onValue(ref(db, 'productos'), (snapshot) => {
    const data = snapshot.val();
    productos = [];
    if (data) {
        for (let id in data) {
            productos.push({
                id: id,
                ...data[id]
            });
        }
    }
    if (usuarioLogueado) {
        renderProductos(productos);
    }
});

window.irARegistro = function(e) {
    e.preventDefault();
    document.getElementById('loginBox').classList.add('ocultar');
    document.getElementById('registroBox').classList.remove('ocultar');
};

window.irALogin = function(e) {
    e.preventDefault();
    document.getElementById('registroBox').classList.add('ocultar');
    document.getElementById('loginBox').classList.remove('ocultar');
};

window.registrarUsuario = function() {
    const userVal = document.getElementById('usuarioReg').value.trim();
    const passVal = document.getElementById('claveReg').value;

    if (userVal === "" || passVal === "") {
        alert("Por favor rellene todos los campos para crear su cuenta.");
        return;
    }

    const rutaUser = ref(db, `usuarios/${userVal}`);
    
    get(rutaUser).then((snapshot) => {
        if (snapshot.exists()) {
            alert("El nombre de usuario ya se encuentra registrado. Elige otro.");
        } else {
            set(rutaUser, { password: passVal })
            .then(() => {
                alert("¡Cuenta creada exitosamente! Ya puede iniciar sesión.");
                document.getElementById('usuarioReg').value = "";
                document.getElementById('claveReg').value = "";
                document.getElementById('registroBox').classList.add('ocultar');
                document.getElementById('loginBox').classList.remove('ocultar');
            })
            .catch((err) => {
                console.error(err);
                alert("Error de guardado en la base de datos.");
            });
        }
    });
};

window.iniciarSesion = function() {
    const userVal = document.getElementById('usuarioLogin').value.trim();
    const passVal = document.getElementById('claveLogin').value;
    
    if (userVal === "" || passVal === "") {
        alert("Por favor, introduce tu usuario y contraseña.");
        return;
    }

    const rutaUser = ref(db, `usuarios/${userVal}`);

    get(rutaUser).then((snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData.password === passVal) {
                usuarioLogueado = {
                    nombre: userVal,
                    avatar: "img/volo.png"
                };

                document.getElementById('seccionLogin').classList.add('ocultar');
                document.getElementById('pantallaPrincipal').classList.remove('ocultar');
                document.getElementById('nombreUsuario').innerText = usuarioLogueado.nombre;
                document.getElementById('avatarUsuario').src = usuarioLogueado.avatar;
                
                renderProductos(productos);
            } else {
                alert("Contraseña incorrecta. Por favor intente de nuevo.");
            }
        } else {
            alert("El usuario no existe en la base de datos. Por favor regístrese.");
        }
    }).catch((err) => {
        console.error(err);
        alert("Error al conectar con el servidor de autenticación.");
    });
};

window.cerrarSesion = function() {
    usuarioLogueado = null;
    carrito = [];
    listaFoliosSesion = [];
    dibujarCarrito();
    
    document.getElementById('usuarioLogin').value = "";
    document.getElementById('claveLogin').value = "";
    
    document.getElementById('lateralCarrito').classList.remove('activo');
    document.getElementById('lateralBot').classList.remove('activo');
    document.getElementById('pantallaPrincipal').classList.add('ocultar');
    document.getElementById('seccionLogin').classList.remove('ocultar');
};

function renderProductos(arregloProductos) {
    const grid = document.getElementById('galeriaProductos');
    if (!grid) return;

    if (arregloProductos.length === 0) {
        grid.innerHTML = `<p class="vacioTexto">No hay productos disponibles por el momento.</p>`;
        return;
    }

    const html = arregloProductos.map(item => {
        const stock = item.cantidad || 0;
        const sinStock = stock <= 0;

        const infoStock = sinStock 
            ? `<p style="font-weight: bold; color: #e74c3c; font-size: 1.2rem; margin: 15px 0;">⚠️ AGOTADO</p>`
            : `<p style="font-weight: bold; color: #3f555c;">Disponibles: ${stock} pzs</p>
               <p style="font-size: 1.15rem; font-weight: bold;">$${item.precio}.00</p>`;

        const boton = sinStock
            ? `<button disabled style="background-color: #bdc3c7; color: #7f8c8d; cursor: not-allowed; transform: none; box-shadow: none;">No disponible</button>`
            : `<button onclick="meterAlCarrito('${item.id}')">Agregar al carrito</button>`;

        return `
            <div class="tarjetaProd" style="${sinStock ? 'opacity: 0.75; border: 1px dashed #e74c3c;' : ''}">
                <img src="${item.img}" alt="${item.nombre}" style="${sinStock ? 'filter: grayscale(80%);' : ''}">
                <h3>${item.nombre}</h3>
                <p>${item.descripcion || ''}</p>
                ${infoStock}
                ${boton}
            </div>
        `;
    }).join('');

    grid.innerHTML = html;
}

window.filtrarCategoria = function(cat) {
    if (cat === 'todos') {
        renderProductos(productos);
    } else {
        const filtrados = productos.filter(item => item.categoria === cat);
        renderProductos(filtrados);
    }
};

window.meterAlCarrito = function(id) {
    if (!usuarioLogueado) return;
    const itemSeleccionado = productos.find(p => p.id === id);
    
    if (itemSeleccionado) {
        const cantidadEnCarro = carrito.filter(p => p.id === id).length;

        if (itemSeleccionado.cantidad <= 0 || cantidadEnCarro >= itemSeleccionado.cantidad) {
            alert(`Lo sentimos, no puedes agregar más unidades de "${itemSeleccionado.nombre}". Has alcanzado el límite del stock disponible.`);
            return;
        }
        carrito.push(itemSeleccionado);
        dibujarCarrito();
    }
};

function dibujarCarrito() {
    document.getElementById('badgeCarrito').innerText = carrito.length;
    const panelItems = document.getElementById('itemsCarrito');
    let cuentaTotal = 0;

    const html = carrito.map((item, index) => {
        cuentaTotal += item.precio;
        return `
            <div class="renglonCarrito" style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom: 5px;">
                <span>${item.nombre}</span>
                <span>$${item.precio} <button onclick="quitarDelCarrito(${index})" style="background:none; border:none; cursor:pointer;">❌</button></span>
            </div>
        `;
    }).join('');

    panelItems.innerHTML = html;
    document.getElementById('montoTotal').innerText = cuentaTotal.toFixed(2);
}

window.quitarDelCarrito = function(index) {
    carrito.splice(index, 1);
    dibujarCarrito();
};

window.toggleCarrito = function() {
    if (document.getElementById('lateralBot').classList.contains('activo')) {
        document.getElementById('lateralBot').classList.remove('activo');
    }
    document.getElementById('lateralCarrito').classList.toggle('activo');
    
    if (document.getElementById('lateralCarrito').classList.contains('activo')) {
        const opc = document.getElementById('tipoEntrega').value;
        if (opc === 'domicilio' && miMapa) {
            setTimeout(() => { miMapa.invalidateSize(); }, 300);
        }
    }
};

window.toggleChatbot = function() {
    if (document.getElementById('lateralCarrito').classList.contains('activo')) {
        document.getElementById('lateralCarrito').classList.remove('activo');
    }
    document.getElementById('lateralBot').classList.toggle('activo');
};

window.revisarMetodoEntrega = function() {
    const opc = document.getElementById('tipoEntrega').value;
    const bloqueDir = document.getElementById('bloqueDireccion');
    
    if (opc === 'domicilio') {
        bloqueDir.style.display = 'block';
        if (!miMapa) {
            crearMapaBase();
        } else {
            setTimeout(() => { miMapa.invalidateSize(); }, 100);
        }
    } else {
        bloqueDir.style.display = 'none';
        document.getElementById('direccionTexto').value = "";
    }
};

function crearMapaBase() {
    const centroMundo = [23.6345, -102.5528]; 
    
    miMapa = L.map('mapaEnvio', {
        zoomControl: true,
        attributionControl: false
    }).setView(centroMundo, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(miMapa);

    miMarcador = L.marker(centroMundo, { draggable: true }).addTo(miMapa);

    miMarcador.on('dragend', function() {
        const coord = miMarcador.getLatLng();
        buscarDireccionInversa(coord.lat, coord.lng);
    });
}

window.buscarMiUbicacion = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                
                if (miMapa && miMarcador) {
                    miMapa.setView([lat, lng], 17);
                    miMarcador.setLatLng([lat, lng]);
                    buscarDireccionInversa(lat, lng);
                }
            },
            () => {
                alert("No se pudo acceder a tu GPS. Por favor, escribe la dirección.");
            }
        );
    } else {
        alert("Tu navegador no soporta geolocalización.");
    }
};

function buscarDireccionInversa(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                document.getElementById('direccionTexto').value = data.display_name;
            }
        })
        .catch(err => console.error(err));
}

window.enviarMensajeManual = function() {
    const campo = document.getElementById('inputChat');
    analizarTextoBot(campo.value);
    campo.value = "";
};

window.clickSugerencia = function(frase) {
    analizarTextoBot(frase);
};

function analizarTextoBot(msgDelUsuario) {
    const areaMensajes = document.getElementById('chatContenedor');
    if (!msgDelUsuario || msgDelUsuario.trim() === "") return;

    areaMensajes.innerHTML += `<div class="msgUsuario">${msgDelUsuario}</div>`;
    areaMensajes.scrollTop = areaMensajes.scrollHeight;

    setTimeout(() => {
        let respuesta = "Disculpa, no reconozco ese comando. Puedes pulsar sobre mis botones de sugerencia rápidos para ayudarte de forma inmediata.";
        const normalizado = msgDelUsuario.toLowerCase();

        if (normalizado.includes('hacer pedido') || normalizado.includes('pedir') || normalizado.includes('cómo')) {
            respuesta = "¡Es súper fácil! 😉 Navega en el menú superior por categorías, pulsa el botón <b>'Agregar al carrito'</b> del producto deseado 🛒 y finalmente abre el carrito (icono rojo) para rellenar tus datos y finalizar la orden.";
        } 
        else if (normalizado.includes('mejor de la casa') || normalizado.includes('sugerencia') || normalizado.includes('recomienda')) {
            const enStock = productos.filter(p => (p.cantidad || 0) > 0);
            if (enStock.length === 0) {
                respuesta = "Actualmente no contamos con productos con stock suficiente en cocina para sugerirte, ¡espera un momento por favor!";
            } else {
                const indexRandom = Math.floor(Math.random() * enStock.length);
                const sugerido = enStock[indexRandom];
                respuesta = `⭐ <b>Recomendación del Chef:</b> Te sugerimos probar hoy nuestro exquisito <b>"${sugerido.nombre}"</b>. Está calientito y listo por solo <b>$${sugerido.precio}.00</b> pesos. ¡Te encantará!`;
            }
        } 
        else if (normalizado.includes('estado') || normalizado.includes('mi pedido') || normalizado.includes('checar') || normalizado.includes('consultar')) {
            if (listaFoliosSesion.length === 0) {
                respuesta = "No registras ningún pedido completado en esta sesión todavía. ¡Anímate a ordenar un volován o un burrito!";
            } else {
                respuesta = "<b>Estatus de tus órdenes recientes:</b><br><br>";
                listaFoliosSesion.forEach((folio) => {
                    respuesta += `• Folio <b>#${folio}</b>: En Cocina (Preparándose con ingredientes frescos) 👨‍🍳🔥<br>`;
                });
                respuesta += "<br><small><i>Nuestros administradores actualizarán tu orden a la brevedad.</i></small>";
            }
        } 
        else if (normalizado.includes('horario') || normalizado.includes('abierto')) {
            respuesta = "🕒 <b>Nuestros Horarios de Atención:</b><br>Estamos abiertos de Lunes a Sábado desde las <b>9:00 AM</b> hasta las <b>8:00 PM</b>. ¡Hacemos entregas calientitas y rápidas!";
        }

        areaMensajes.innerHTML += `<div class="msgBot">${respuesta}</div>`;
        areaMensajes.scrollTop = areaMensajes.scrollHeight;
    }, 550);
}

window.detectarEnter = function(e) {
    if (e.key === 'Enter') {
        window.enviarMensajeManual();
    }
};

function armarBarrasHTML(folioNum) {
    const digitos = String(folioNum).split('');
    let bloqueBarras = `<div style="display: flex; align-items: center; justify-content: center; background: white; padding: 10px; border: 1px solid #ccc; width: fit-content; margin: 10px auto; border-radius: 4px;">`;
    
    bloqueBarras += `<div style="width: 2px; height: 40px; background: black; margin-right: 1px;"></div>`;
    bloqueBarras += `<div style="width: 2px; height: 40px; background: black; margin-right: 3px;"></div>`;

    digitos.forEach((char) => {
        const val = parseInt(char);
        const g1 = (val % 3) + 1;
        const g2 = ((val + 2) % 3) + 1;
        bloqueBarras += `<div style="width: ${g1}px; height: 40px; background: black; margin-right: 2px;"></div>`;
        bloqueBarras += `<div style="width: ${g2}px; height: 40px; background: black; margin-right: 2px;"></div>`;
    });

    bloqueBarras += `<div style="width: 2px; height: 40px; background: black; margin-left: 1px;"></div>`;
    bloqueBarras += `<div style="width: 2px; height: 40px; background: black; margin-left: 1px;"></div>`;
    
    bloqueBarras += `</div><div style="font-family: monospace; letter-spacing: 5px; font-weight: bold; font-size: 14px; text-align: center;">*${folioNum}*</div>`;
    return bloqueBarras;
}

window.procesarCompra = function() {
    if (!usuarioLogueado) {
        alert("Debes iniciar sesión para realizar un pedido.");
        return;
    }
    if (carrito.length === 0) {
        alert("Tu carrito está vacío. ¡Agrega unas delicias primero!");
        return;
    }

    const opc = document.getElementById('tipoEntrega').value;
    let descDireccion = "Recoge en tienda (Local)";

    if (opc === 'domicilio') {
        const rawDir = document.getElementById('direccionTexto').value.trim();
        if (rawDir === "") {
            alert("Por favor, introduce tu dirección o usa el botón de ubicación en el mapa.");
            return;
        }
        descDireccion = rawDir;
    }

    const totalNum = parseFloat(document.getElementById('montoTotal').innerText);
    const reloj = new Date();
    const tiempoTexto = reloj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const numFolio = Math.floor(10000 + Math.random() * 90000);
    
    listaFoliosSesion.push(numFolio);

    const logInventario = {};

    carrito.forEach(prod => {
        const tablaVentas = ref(db, 'ventas');
        const registroVenta = push(tablaVentas);
        
        set(registroVenta, {
            idPedido: numFolio,
            usuario: usuarioLogueado.nombre,
            producto: prod.nombre,
            total: prod.precio,
            hora: tiempoTexto,
            metodoEntrega: opc,
            direccion: descDireccion
        });

        if (!logInventario[prod.id]) {
            logInventario[prod.id] = {
                actual: prod.cantidad,
                restar: 1
            };
        } else {
            logInventario[prod.id].restar += 1;
        }
    });

    for (const idProd in logInventario) {
        const datosInv = logInventario[idProd];
        const stockFinal = Math.max(0, datosInv.actual - datosInv.restar);
        set(ref(db, `productos/${idProd}/cantidad`), stockFinal);
    }

    const bannerEntrega = opc === 'domicilio' ? 'SERVICIO A DOMICILIO 🛵' : 'RECOGER EN EL LOCAL 🏪';

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '99999';

    const layoutBarras = armarBarrasHTML(numFolio);

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; max-width: 420px; width: 90%; text-align: center; font-family: 'Chelsea Market', system-ui, sans-serif; box-shadow: 0px 4px 15px rgba(0,0,0,0.2);">
            <h2 style="color: #3f555c; margin-top: 0;">¡Pedido Recibido! 🎉</h2>
            <p>Hola <b>${usuarioLogueado.nombre}</b>, tu orden ha sido procesada exitosamente.</p>
            <hr style="border: 0; border-top: 1px dashed #ccc; margin: 15px 0;">
            <p style="margin: 5px 0;"><b>Método:</b> ${bannerEntrega}</p>
            <p style="margin: 5px 0; text-align: left; font-size: 0.95rem;"><b>Dirección:</b> ${descDireccion}</p>
            <p style="margin: 5px 0; font-size: 1.2rem; color: #2ecc71;"><b>Total Pagado:</b> $${totalNum.toFixed(2)}</p>
            <p style="margin: 5px 0; font-size: 0.9rem; color: #7f8c8d;">Hora: ${tiempoTexto}</p>
            <hr style="border: 0; border-top: 1px dashed #ccc; margin: 15px 0;">
            <p style="margin-bottom: 5px; font-weight: bold; color: #3f555c;">Tu Folio de Seguimiento:</p>
            
            ${layoutBarras}

            <button id="cerrarModalBtn" style="margin-top: 25px; background: #3f555c; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%;">Entendido</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('cerrarModalBtn').onclick = function() {
        modal.remove();
    };
    
    carrito = [];
    document.getElementById('direccionTexto').value = "";
    document.getElementById('tipoEntrega').value = "local";
    document.getElementById('bloqueDireccion').style.display = "none";
    dibujarCarrito();
    window.toggleCarrito();
};