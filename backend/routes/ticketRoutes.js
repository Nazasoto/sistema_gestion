import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.js';
import * as ticketController from '../controllers/ticketController.js';

const router = Router();

// Aplicar el middleware de autenticación a todas las rutas
router.use(verificarToken);

// Importar el middleware de autorización
import { authorizeRoles } from '../middlewares/auth.js';

// Rutas para los tickets (sin parámetros)
router.post('/', ticketController.crearTicket);
router.get('/', ticketController.obtenerMisTickets);
router.get('/todos', authorizeRoles(['soporte', 'supervisor', 'admin']), ticketController.obtenerTodosLosTickets);
router.get('/estadisticas', ticketController.obtenerEstadisticas);

// Rutas para supervisores (ANTES de las rutas con parámetros)
router.get('/pendientes-aprobacion', authorizeRoles(['supervisor', 'admin']), ticketController.obtenerTicketsPendientesAprobacion);
router.get('/supervisor/historial', authorizeRoles(['supervisor', 'admin']), ticketController.obtenerHistorialSupervisor);
router.get('/supervisor/estadisticas', authorizeRoles(['supervisor', 'admin']), ticketController.obtenerEstadisticasSupervisor);

// Ruta para verificar tickets activos de un usuario
router.get('/user/:userId/active', authorizeRoles(['soporte', 'supervisor', 'admin']), ticketController.obtenerTicketsActivosUsuario);

// Rutas específicas de ticket (requieren ID) - DESPUÉS de las rutas específicas
router.route('/:id')
  .get(ticketController.esPropietarioOTienePermiso, ticketController.obtenerTicket)
  .put(ticketController.esPropietarioOTienePermiso, ticketController.actualizarTicket)
  .delete(ticketController.esPropietarioOTienePermiso, ticketController.eliminarTicket);

// Rutas para operaciones específicas con ID
router.patch('/:id/estado', ticketController.esPropietarioOTienePermiso, ticketController.cambiarEstadoTicket);
router.post('/:id/asignar', ticketController.esPropietarioOTienePermiso, ticketController.asignarTicket);
router.post('/:id/reasignar', authorizeRoles(['soporte', 'supervisor', 'admin']), ticketController.reasignarTicket);
router.post('/:id/aprobar', authorizeRoles(['supervisor', 'admin']), ticketController.aprobarTicket);
router.post('/:id/rechazar', authorizeRoles(['supervisor', 'admin']), ticketController.rechazarTicket);
router.post('/:id/enviar-informe-supervisor', authorizeRoles(['soporte', 'admin']), ticketController.enviarInformeASupervisor);

export default router;
