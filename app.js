// CONFIGURACION
const SUPABASE_URL = 'https://zejzrujrspeoszpfbjce.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplanpydWpyc3Blb3N6cGZiamNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDMyNDMsImV4cCI6MjA3NTE3OTI0M30.UAi4jQ0BH1hphW7OEh4JWP4hdVJ4CmvX6x4CyP2ak-U';
const N8N_WEBHOOK_URL = 'https://webhook.red51.site/webhook/pedidos_red51';

// VARIABLES GLOBALES
let carrito = [];
let supabaseClient = null;
let categoriaActual = 'todos';
let productos = [];
let usuarioActual = null;
let pedidos = [];
let filtroEstadoActual = 'todos';
let filtroFechaActual = 'todos';
let busquedaActual = '';

// INICIALIZACION
function inicializarSupabase() {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    verificarSesion();
}

async function verificarSesion() {
    if (!supabaseClient) return;
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        usuarioActual = session.user;
        mostrarPanelAdmin();
    }
}

// AUTENTICACION
async function iniciarSesion(event) {
    event.preventDefault();
    
    const email = document.getElementById('emailLogin').value;
    const password = document.getElementById('passwordLogin').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.style.display = 'none';
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        usuarioActual = data.user;
        mostrarPanelAdmin();
        
    } catch (error) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Error al iniciar sesion: ' + error.message;
    }
}

function mostrarPanelAdmin() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('adminEmail').textContent = usuarioActual.email;
    
    // Agregar botón de pedidos al header del admin si no existe
    const adminHeader = document.querySelector('.admin-header');
    if (adminHeader && !document.getElementById('btnPedidos')) {
        const btnPedidos = document.createElement('button');
        btnPedidos.className = 'btn-secondary';
        btnPedidos.id = 'btnPedidos';
        btnPedidos.textContent = 'Gestionar Pedidos';
        btnPedidos.onclick = mostrarGestionPedidos;
        adminHeader.querySelector('div').prepend(btnPedidos);
    }
    
    cargarProductosAdmin();
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    usuarioActual = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('pedidosPanel').style.display = 'none';
    mostrarTienda();
}

// NAVEGACION
function mostrarTienda() {
    document.getElementById('tiendaView').style.display = 'block';
    document.getElementById('adminView').style.display = 'none';
}

function mostrarAdmin() {
    document.getElementById('tiendaView').style.display = 'none';
    document.getElementById('adminView').style.display = 'block';
    
    if (usuarioActual) {
        mostrarPanelAdmin();
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('pedidosPanel').style.display = 'none';
    }
}

// PRODUCTOS - TIENDA
async function cargarProductos() {
    if (!supabaseClient) {
        console.error('Supabase no inicializado');
        return;
    }

    document.getElementById('loadingProducts').style.display = 'block';

    try {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        productos = data || [];
        renderizarCategorias();
        renderizarProductos();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="empty-cart"><p>Error al cargar productos. Verifica que las tablas esten creadas en Supabase.</p></div>';
    } finally {
        document.getElementById('loadingProducts').style.display = 'none';
    }
}

function renderizarCategorias() {
    if (productos.length === 0) {
        document.getElementById('categoryFilter').innerHTML = '';
        return;
    }
    
    const categorias = ['todos', ...new Set(productos.map(p => p.categoria))];
    const filterContainer = document.getElementById('categoryFilter');
    
    filterContainer.innerHTML = categorias.map(cat => `
        <button class="filter-btn ${cat === categoriaActual ? 'active' : ''}" 
                onclick="filtrarCategoria('${cat}')">
            ${getCategoriaName(cat)}
        </button>
    `).join('');
}

function filtrarCategoria(categoria) {
    categoriaActual = categoria;
    renderizarCategorias();
    renderizarProductos();
}

function renderizarProductos() {
    const grid = document.getElementById('productsGrid');
    const productosFiltrados = categoriaActual === 'todos' 
        ? productos 
        : productos.filter(p => p.categoria === categoriaActual);
    
    if (productosFiltrados.length === 0) {
        grid.innerHTML = '<div class="empty-cart"><p>No hay productos disponibles. Ve al panel de Admin para agregar productos.</p></div>';
        return;
    }

    grid.innerHTML = productosFiltrados.map(producto => `
        <div class="product-card">
            <div class="product-image">
                <span>${producto.icon || '📦'}</span>
                ${producto.badge ? `<span class="product-badge">${producto.badge}</span>` : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${getCategoriaName(producto.categoria)}</div>
                <h3 class="product-name">${producto.nombre}</h3>
                <div class="product-brand">${producto.marca}</div>
                <p class="product-description">${producto.descripcion}</p>
                <div class="product-price">S/ ${parseFloat(producto.precio).toFixed(2)}</div>
                <button class="add-to-cart-btn" onclick="agregarAlCarrito(${producto.id})">
                    Agregar al Carrito
                </button>
            </div>
        </div>
    `).join('');
}

function getCategoriaName(categoria) {
    const nombres = {
        'todos': 'Todos',
        'moviles': 'Smartphones & Tablets',
        'audio': 'Audio',
        'hogar': 'Hogar Inteligente',
        'computacion': 'Computacion',
        'entretenimiento': 'Entretenimiento'
    };
    return nombres[categoria] || categoria;
}

// CARRITO
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    const itemExistente = carrito.find(item => item.id === productoId);
    
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }
    
    actualizarContadorCarrito();
    mostrarNotificacion('Producto agregado al carrito');
}

function actualizarContadorCarrito() {
    const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    document.getElementById('cartCount').textContent = total;
}

function abrirCarrito() {
    document.getElementById('cartModal').style.display = 'block';
    renderizarCarrito();
}

function cerrarCarrito() {
    document.getElementById('cartModal').style.display = 'none';
}

function renderizarCarrito() {
    const content = document.getElementById('cartContent');
    document.getElementById('successMessage').style.display = 'none';
    
    if (carrito.length === 0) {
        content.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <p>Tu carrito esta vacio</p>
            </div>
        `;
        return;
    }
    
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    content.innerHTML = `
        ${carrito.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-icon">${item.icon || '📦'}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nombre}</div>
                    <div class="cart-item-brand">${item.marca}</div>
                    <div class="cart-item-price">S/ ${parseFloat(item.precio).toFixed(2)} c/u</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="cambiarCantidad(${index}, -1)">-</button>
                        <span class="qty-display">${item.cantidad}</span>
                        <button class="qty-btn" onclick="cambiarCantidad(${index}, 1)">+</button>
                        <button class="remove-btn" onclick="eliminarItem(${index})">Eliminar</button>
                    </div>
                </div>
                <div style="font-weight: 700; font-size: 1.2rem; color: var(--primary);">
                    S/ ${(item.precio * item.cantidad).toFixed(2)}
                </div>
            </div>
        `).join('')}
        
        <div class="cart-total">
            <span class="cart-total-label">Total:</span>
            <span class="cart-total-amount">S/ ${total.toFixed(2)}</span>
        </div>
        
        <form class="checkout-form" onsubmit="realizarPedido(event)">
            <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" id="nombreCliente" required>
            </div>
            <div class="form-group">
                <label>Telefono</label>
                <input type="tel" id="telefonoCliente" required>
            </div>
            <div class="form-group">
                <label>Email (Opcional)</label>
                <input type="email" id="emailCliente">
            </div>
            <div class="form-group">
                <label>Direccion de Entrega</label>
                <textarea id="direccionCliente" required></textarea>
            </div>
            <div class="form-group">
                <label>Notas Adicionales (Opcional)</label>
                <textarea id="notasCliente" placeholder="Preferencias, instrucciones especiales..."></textarea>
            </div>
            <button type="submit" class="btn-primary">Realizar Pedido</button>
        </form>
    `;
}

function cambiarCantidad(index, cambio) {
    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) {
        carrito.splice(index, 1);
    }
    actualizarContadorCarrito();
    renderizarCarrito();
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    actualizarContadorCarrito();
    renderizarCarrito();
}

// PEDIDOS - CONEXIÓN CON N8N
async function realizarPedido(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('nombreCliente').value;
    const telefono = document.getElementById('telefonoCliente').value;
    const email = document.getElementById('emailCliente').value;
    const direccion = document.getElementById('direccionCliente').value;
    const notas = document.getElementById('notasCliente').value;
    
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    const pedidoData = {
        nombre: nombre,
        telefono: telefono,
        email: email || '',
        direccion: direccion,
        notas: notas || '',
        productos: carrito.map(item => ({
            producto: item.nombre,
            marca: item.marca,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            subtotal: item.precio * item.cantidad
        })),
        total: total
    };
    
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pedidoData)
        });
        
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('cartContent').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';
            // Opcional: mostrar número de pedido en el mensaje de éxito
            if (result.numero_pedido) {
                document.querySelector('#successMessage h3').textContent = 
                    `Pedido ${result.numero_pedido} Realizado con Éxito`;
            }
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al realizar el pedido: ' + error.message);
    }
}

function cerrarYLimpiar() {
    carrito = [];
    actualizarContadorCarrito();
    cerrarCarrito();
    document.getElementById('cartContent').style.display = 'block';
}

// ADMIN - GESTION DE PRODUCTOS
async function cargarProductosAdmin() {
    if (!supabaseClient) return;

    document.getElementById('loadingAdmin').style.display = 'block';

    try {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .order('nombre');

        if (error) throw error;

        const tbody = document.getElementById('adminProductsTable');
        tbody.innerHTML = (data || []).map(producto => `
            <tr>
                <td>${producto.icon || '📦'}</td>
                <td>${producto.nombre}</td>
                <td>${producto.marca}</td>
                <td>${getCategoriaName(producto.categoria)}</td>
                <td>S/ ${parseFloat(producto.precio).toFixed(2)}</td>
                <td>${producto.activo ? 'Activo' : 'Inactivo'}</td>
                <td class="table-actions">
                    <button class="btn-edit" onclick="editarProducto(${producto.id})">Editar</button>
                    <button class="btn-danger" onclick="eliminarProducto(${producto.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar productos: ' + error.message);
    } finally {
        document.getElementById('loadingAdmin').style.display = 'none';
    }
}

function abrirModalProducto() {
    document.getElementById('productoModalTitle').textContent = 'Agregar Producto';
    document.getElementById('productoForm').reset();
    document.getElementById('productoId').value = '';
    document.getElementById('productoActivo').checked = true;
    document.getElementById('productoModal').style.display = 'block';
}

function cerrarModalProducto() {
    document.getElementById('productoModal').style.display = 'none';
}

async function editarProducto(id) {
    try {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('productoModalTitle').textContent = 'Editar Producto';
        document.getElementById('productoId').value = data.id;
        document.getElementById('productoNombre').value = data.nombre;
        document.getElementById('productoMarca').value = data.marca;
        document.getElementById('productoCategoria').value = data.categoria;
        document.getElementById('productoDescripcion').value = data.descripcion;
        document.getElementById('productoPrecio').value = data.precio;
        document.getElementById('productoIcon').value = data.icon || '';
        document.getElementById('productoBadge').value = data.badge || '';
        document.getElementById('productoActivo').checked = data.activo;
        document.getElementById('productoModal').style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar producto: ' + error.message);
    }
}

async function guardarProducto(event) {
    event.preventDefault();

    const id = document.getElementById('productoId').value;
    const producto = {
        nombre: document.getElementById('productoNombre').value,
        marca: document.getElementById('productoMarca').value,
        categoria: document.getElementById('productoCategoria').value,
        descripcion: document.getElementById('productoDescripcion').value,
        precio: parseFloat(document.getElementById('productoPrecio').value),
        icon: document.getElementById('productoIcon').value || '📦',
        badge: document.getElementById('productoBadge').value || null,
        activo: document.getElementById('productoActivo').checked
    };

    try {
        if (id) {
            const { error } = await supabaseClient
                .from('productos')
                .update(producto)
                .eq('id', id);
            
            if (error) throw error;
            alert('Producto actualizado exitosamente');
        } else {
            const { error } = await supabaseClient
                .from('productos')
                .insert([producto]);
            
            if (error) throw error;
            alert('Producto creado exitosamente');
        }

        cerrarModalProducto();
        cargarProductosAdmin();
        cargarProductos();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar producto: ' + error.message);
    }
}

async function eliminarProducto(id) {
    if (!confirm('Estas seguro de eliminar este producto?')) return;

    try {
        const { error } = await supabaseClient
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Producto eliminado exitosamente');
        cargarProductosAdmin();
        cargarProductos();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar producto: ' + error.message);
    }
}

// DASHBOARD DE PEDIDOS
function mostrarGestionPedidos() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('pedidosPanel').style.display = 'block';
    document.getElementById('adminEmailPedidos').textContent = usuarioActual.email;
    cargarPedidos();
}

function mostrarGestionProductos() {
    document.getElementById('pedidosPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
}

async function cargarPedidos() {
    if (!supabaseClient) return;

    document.getElementById('loadingPedidos').style.display = 'block';

    try {
        const { data, error } = await supabaseClient
            .from('pedidos')
            .select('*')
            .order('fecha_pedido', { ascending: false });

        if (error) throw error;

        pedidos = data || [];
        actualizarEstadisticas();
        renderizarPedidos();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar pedidos: ' + error.message);
    } finally {
        document.getElementById('loadingPedidos').style.display = 'none';
    }
}

function actualizarEstadisticas() {
    const total = pedidos.length;
    const pendientes = pedidos.filter(p => p.estado === 'pendiente_pago').length;
    const confirmados = pedidos.filter(p => p.estado === 'pago_confirmado').length;
    const entregados = pedidos.filter(p => p.estado === 'entregado').length;

    document.getElementById('totalPedidos').textContent = total;
    document.getElementById('pedidosPendientes').textContent = pendientes;
    document.getElementById('pedidosConfirmados').textContent = confirmados;
    document.getElementById('pedidosEntregados').textContent = entregados;
}

function filtrarPedidos() {
    filtroEstadoActual = document.getElementById('filtroEstado').value;
    filtroFechaActual = document.getElementById('filtroFecha').value;
    busquedaActual = document.getElementById('buscarPedido').value.toLowerCase();
    
    renderizarPedidos();
}

function renderizarPedidos() {
    const tbody = document.getElementById('pedidosTableBody');
    
    let pedidosFiltrados = pedidos.filter(pedido => {
        // Filtro por estado
        if (filtroEstadoActual !== 'todos' && pedido.estado !== filtroEstadoActual) {
            return false;
        }
        
        // Filtro por fecha
        if (filtroFechaActual !== 'todos') {
            const fechaPedido = new Date(pedido.fecha_pedido);
            const hoy = new Date();
            
            switch (filtroFechaActual) {
                case 'hoy':
                    if (fechaPedido.toDateString() !== hoy.toDateString()) return false;
                    break;
                case 'semana':
                    const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
                    if (fechaPedido < inicioSemana) return false;
                    break;
                case 'mes':
                    if (fechaPedido.getMonth() !== hoy.getMonth() || fechaPedido.getFullYear() !== hoy.getFullYear()) return false;
                    break;
            }
        }
        
        // Filtro por búsqueda
        if (busquedaActual) {
            const nombre = pedido.nombre_cliente.toLowerCase();
            const telefono = pedido.telefono_cliente.toLowerCase();
            const numeroPedido = pedido.numero_pedido ? pedido.numero_pedido.toLowerCase() : '';
            
            if (!nombre.includes(busquedaActual) && 
                !telefono.includes(busquedaActual) && 
                !numeroPedido.includes(busquedaActual)) {
                return false;
            }
        }
        
        return true;
    });

    if (pedidosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #999;">
                    No se encontraron pedidos con los filtros aplicados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = pedidosFiltrados.map(pedido => `
        <tr>
            <td>
                <strong>${pedido.numero_pedido || 'N/A'}</strong>
            </td>
            <td>
                <div class="cliente-info">
                    <div class="cliente-nombre">${pedido.nombre_cliente}</div>
                    <div class="cliente-contacto">${pedido.telefono_cliente}</div>
                    ${pedido.email_cliente ? `<div class="cliente-contacto">${pedido.email_cliente}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="productos-list">
                    ${JSON.parse(pedido.productos).map(producto => `
                        <div class="producto-item">
                            ${producto.cantidad} x ${producto.producto}
                        </div>
                    `).join('')}
                </div>
            </td>
            <td class="total-pedido">S/ ${parseFloat(pedido.total).toFixed(2)}</td>
            <td>
                <div class="fecha-pedido">
                    ${new Date(pedido.fecha_pedido).toLocaleDateString('es-PE')}
                </div>
            </td>
            <td>
                <span class="estado-badge estado-${pedido.estado}">
                    ${getEstadoNombre(pedido.estado)}
                </span>
            </td>
            <td>
                <div class="acciones-pedido">
                    <button class="btn-estado btn-info" onclick="verDetallePedido('${pedido.id}')">
                        Ver Detalle
                    </button>
                    ${pedido.estado === 'pendiente_pago' ? `
                        <button class="btn-estado btn-success" onclick="cambiarEstadoPedido('${pedido.id}', 'pago_confirmado')">
                            Confirmar Pago
                        </button>
                    ` : ''}
                    ${pedido.estado === 'pago_confirmado' ? `
                        <button class="btn-estado btn-warning" onclick="cambiarEstadoPedido('${pedido.id}', 'en_preparacion')">
                            En Preparación
                        </button>
                    ` : ''}
                    ${pedido.estado === 'en_preparacion' ? `
                        <button class="btn-estado btn-info" onclick="cambiarEstadoPedido('${pedido.id}', 'enviado')">
                            Marcar Enviado
                        </button>
                    ` : ''}
                    ${pedido.estado === 'enviado' ? `
                        <button class="btn-estado btn-success" onclick="cambiarEstadoPedido('${pedido.id}', 'entregado')">
                            Marcar Entregado
                        </button>
                    ` : ''}
                    ${pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' ? `
                        <button class="btn-estado btn-danger" onclick="cambiarEstadoPedido('${pedido.id}', 'cancelado')">
                            Cancelar
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function getEstadoNombre(estado) {
    const estados = {
        'pendiente_pago': 'Pendiente Pago',
        'pago_confirmado': 'Pago Confirmado',
        'en_preparacion': 'En Preparación',
        'enviado': 'Enviado',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado'
    };
    return estados[estado] || estado;
}

async function cambiarEstadoPedido(pedidoId, nuevoEstado) {
    if (!confirm(`¿Estás seguro de cambiar el estado del pedido a "${getEstadoNombre(nuevoEstado)}"?`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('pedidos')
            .update({ 
                estado: nuevoEstado,
                updated_at: new Date().toISOString()
            })
            .eq('id', pedidoId);

        if (error) throw error;

        mostrarNotificacion(`Estado del pedido actualizado a ${getEstadoNombre(nuevoEstado)}`);
        cargarPedidos(); // Recargar la lista

    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar el estado del pedido: ' + error.message);
    }
}

async function verDetallePedido(pedidoId) {
    try {
        const { data, error } = await supabaseClient
            .from('pedidos')
            .select('*')
            .eq('id', pedidoId)
            .single();

        if (error) throw error;

        const pedido = data;
        const productos = JSON.parse(pedido.productos);
        
        document.getElementById('detallePedidoContent').innerHTML = `
            <div class="detalle-pedido">
                <div class="detalle-header">
                    <div class="detalle-cliente">
                        <h3>Información del Cliente</h3>
                        <p><strong>Nombre:</strong> ${pedido.nombre_cliente}</p>
                        <p><strong>Teléfono:</strong> ${pedido.telefono_cliente}</p>
                        ${pedido.email_cliente ? `<p><strong>Email:</strong> ${pedido.email_cliente}</p>` : ''}
                        <p><strong>Dirección:</strong> ${pedido.direccion}</p>
                        ${pedido.notas ? `<p><strong>Notas:</strong> ${pedido.notas}</p>` : ''}
                    </div>
                    <div class="detalle-estado">
                        <p><strong>N° Pedido:</strong> ${pedido.numero_pedido || 'N/A'}</p>
                        <p><strong>Fecha:</strong> ${new Date(pedido.fecha_pedido).toLocaleString('es-PE')}</p>
                        <span class="estado-badge estado-${pedido.estado}">
                            ${getEstadoNombre(pedido.estado)}
                        </span>
                    </div>
                </div>

                <div class="detalle-productos">
                    <h3>Productos del Pedido</h3>
                    ${productos.map(producto => `
                        <div class="detalle-producto">
                            <div class="detalle-producto-info">
                                <strong>${producto.cantidad} x ${producto.producto}</strong>
                                <div>${producto.marca}</div>
                            </div>
                            <div class="detalle-producto-precio">
                                <div>S/ ${parseFloat(producto.precio_unitario).toFixed(2)} c/u</div>
                                <div><strong>S/ ${parseFloat(producto.subtotal).toFixed(2)}</strong></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="detalle-total">
                    <h3>Total del Pedido: S/ ${parseFloat(pedido.total).toFixed(2)}</h3>
                </div>
            </div>

            <div class="acciones-pedido" style="flex-direction: row; justify-content: center;">
                ${pedido.estado === 'pendiente_pago' ? `
                    <button class="btn-estado btn-success" onclick="cambiarEstadoPedido('${pedido.id}', 'pago_confirmado'); cerrarDetallePedido()">
                        Confirmar Pago
                    </button>
                ` : ''}
                ${pedido.estado === 'pago_confirmado' ? `
                    <button class="btn-estado btn-warning" onclick="cambiarEstadoPedido('${pedido.id}', 'en_preparacion'); cerrarDetallePedido()">
                        En Preparación
                    </button>
                ` : ''}
                ${pedido.estado === 'en_preparacion' ? `
                    <button class="btn-estado btn-info" onclick="cambiarEstadoPedido('${pedido.id}', 'enviado'); cerrarDetallePedido()">
                        Marcar Enviado
                    </button>
                ` : ''}
                ${pedido.estado === 'enviado' ? `
                    <button class="btn-estado btn-success" onclick="cambiarEstadoPedido('${pedido.id}', 'entregado'); cerrarDetallePedido()">
                        Marcar Entregado
                    </button>
                ` : ''}
                ${pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' ? `
                    <button class="btn-estado btn-danger" onclick="cambiarEstadoPedido('${pedido.id}', 'cancelado'); cerrarDetallePedido()">
                        Cancelar Pedido
                    </button>
                ` : ''}
            </div>
        `;

        document.getElementById('detallePedidoModal').style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el detalle del pedido: ' + error.message);
    }
}

function cerrarDetallePedido() {
    document.getElementById('detallePedidoModal').style.display = 'none';
}

// UTILIDADES
function mostrarNotificacion(mensaje) {
    const notif = document.createElement('div');
    notif.textContent = mensaje;
    notif.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: var(--shadow);
        z-index: 10000;
        font-weight: 600;
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

// EVENT LISTENERS
window.onclick = function(event) {
    if (event.target == document.getElementById('cartModal')) {
        cerrarCarrito();
    }
    if (event.target == document.getElementById('productoModal')) {
        cerrarModalProducto();
    }
    if (event.target == document.getElementById('detallePedidoModal')) {
        cerrarDetallePedido();
    }
}

// INICIALIZACION
document.addEventListener('DOMContentLoaded', function() {
    inicializarSupabase();
    cargarProductos();
});
