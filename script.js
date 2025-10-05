// DASHBOARD DE PEDIDOS
let pedidos = [];
let filtroEstadoActual = 'todos';
let filtroFechaActual = 'todos';
let busquedaActual = '';

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

// Modificar la función mostrarPanelAdmin para incluir el botón de pedidos
function mostrarPanelAdmin() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('adminEmail').textContent = usuarioActual.email;
    
    // Agregar botón de pedidos al header del admin
    const adminHeader = document.querySelector('.admin-header');
    if (!document.getElementById('btnPedidos')) {
        const btnPedidos = document.createElement('button');
        btnPedidos.className = 'btn-secondary';
        btnPedidos.id = 'btnPedidos';
        btnPedarios.textContent = 'Gestionar Pedidos';
        btnPedidos.onclick = mostrarGestionPedidos;
        adminHeader.querySelector('div').prepend(btnPedidos);
    }
    
    cargarProductosAdmin();
}
