import { Router } from 'express';
import MySQLService from './services/mysql.service.js';

const router = Router();

// Servicio de noticias en MySQL (tabla 'noticias')
const noticiasModel = new MySQLService('noticias', { idField: 'id_noticia' });

// Asegurar columna 'image' como MEDIUMTEXT si no existe o es muy pequeña
async function ensureImageColumn() {
  try {
    const dbName = process.env.DB_NAME || 'ticket';
    const rows = await noticiasModel.query(
      `SELECT DATA_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'noticias' AND COLUMN_NAME = 'image'`,
      [dbName]
    );
    const exists = rows && rows.length > 0;
    if (!exists) {
      await noticiasModel.query('ALTER TABLE `noticias` ADD COLUMN `image` MEDIUMTEXT NULL');
      return;
    }
    const dataType = rows[0].DATA_TYPE?.toLowerCase?.() || '';
    if (!['mediumtext', 'longtext'].includes(dataType)) {
      await noticiasModel.query('ALTER TABLE `noticias` MODIFY COLUMN `image` MEDIUMTEXT NULL');
    }
  } catch (e) {
    // No bloquear por error de migración; se registrará y continuará
    console.error('ensureImageColumn error:', e?.message || e);
  }
}

// GET /api/noticias
router.get('/', async (req, res, next) => {
  try {
    const rows = await noticiasModel.getAll({ orderBy: 'id_noticia', orderDirection: 'DESC' });
    const data = rows.map(r => ({
      id: r.id_noticia,
      titulo: r.titulo,
      descripcion: r.description,
      estado: r.estado,
      // Derivados/no persistidos para compat front
      fecha: null,
      autor: '',
      imagen: r.image || '',
      links: [],
      archivada: r.estado === 'archivada'
    }));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/noticias
router.post('/', async (req, res, next) => {
  try {
    const input = req.body;
    if (!input.titulo || !input.descripcion) {
      return res.status(400).json({ error: 'Título y descripción requeridos' });
    }
    // Migración dinámica para columna de imagen
    if (input.imagen) {
      await ensureImageColumn();
    }
    const created = await noticiasModel.create({
      titulo: input.titulo,
      description: input.descripcion,
      estado: input.estado || 'activa',
      image: input.imagen || null
    });
    res.status(201).json({
      id: created.id_noticia,
      titulo: created.titulo,
      descripcion: created.description,
      estado: created.estado,
      fecha: input.fecha || new Date().toISOString().slice(0,10),
      autor: input.autor || '',
      imagen: created.image || input.imagen || '',
      links: Array.isArray(input.links) ? input.links : [],
      archivada: false
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/noticias/:id/archivar
router.patch('/:id/archivar', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await noticiasModel.update(id, { estado: 'archivada' });
    if (!updated) return res.status(404).json({ error: 'No encontrada' });
    res.json({
      id: updated.id_noticia,
      titulo: updated.titulo,
      descripcion: updated.description,
      estado: updated.estado,
      fecha: null,
      autor: '',
      imagen: updated.image || '',
      links: [],
      archivada: true
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/noticias/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await noticiasModel.delete(id);
    if (!ok) return res.status(404).json({ error: 'No encontrada' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/noticias/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const r = await noticiasModel.getById(id);
    if (!r) return res.status(404).json({ error: 'No encontrada' });
    res.json({
      id: r.id_noticia,
      titulo: r.titulo,
      descripcion: r.description,
      estado: r.estado,
      fecha: null,
      autor: '',
      imagen: r.image || '',
      links: [],
      archivada: r.estado === 'archivada'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
