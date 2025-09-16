import Joi from 'joi';

// Esquemas de validación existentes
const ticketSchema = Joi.object({
  asunto: Joi.string().min(3).max(200).required(),
  descripcion: Joi.string().min(10).max(2000).required(),
  prioridad: Joi.string().valid('baja', 'media', 'alta', 'critica').required(),
  categoria: Joi.string().max(100).optional()
});

const loginSchema = Joi.object({
  usuario: Joi.string().min(3).max(100).required(),
  password: Joi.string().min(6).required()
});

const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

const profileSchema = Joi.object({
  nombre: Joi.string().min(2).max(50).required(),
  apellido: Joi.string().min(2).max(50).required(),
  telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/).max(20).optional(),
  email: Joi.string().email().max(100).optional()
});

// Middleware de validación genérico
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de validación incorrectos',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Validaciones específicas
const validateTicket = validate(ticketSchema);
const validateLogin = validate(loginSchema);
const validatePasswordChange = validate(passwordChangeSchema);
const validateProfile = validate(profileSchema);

// Validación de parámetros de búsqueda
const validateSearchParams = (req, res, next) => {
  const { page, limit, search } = req.query;
  
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      error: 'Parámetro page debe ser un número mayor a 0'
    });
  }
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      error: 'Parámetro limit debe ser un número entre 1 y 100'
    });
  }
  
  if (search && typeof search !== 'string') {
    return res.status(400).json({
      error: 'Parámetro search debe ser una cadena de texto'
    });
  }
  
  next();
};

// Validaciones para 2FA
const validateTwoFactorSetup = (req, res, next) => {
  const { setupToken, verificationCode } = req.body;
  
  const errors = [];
  
  if (!setupToken || typeof setupToken !== 'string' || setupToken.trim().length === 0) {
    errors.push('Token de configuración es requerido');
  }
  
  if (!verificationCode || typeof verificationCode !== 'string') {
    errors.push('Código de verificación es requerido');
  } else {
    const cleanCode = verificationCode.replace(/\s|-/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      errors.push('El código debe tener 6 dígitos');
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Datos de validación incorrectos',
      details: errors
    });
  }
  
  next();
};

const validateTwoFactorVerification = (req, res, next) => {
  const { userId, code, useBackupCode } = req.body;
  
  const errors = [];
  
  if (!userId || (typeof userId !== 'number' && typeof userId !== 'string')) {
    errors.push('ID de usuario es requerido');
  }
  
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    errors.push('Código es requerido');
  } else if (!useBackupCode) {
    // Validar formato solo para códigos TOTP, no para códigos de respaldo
    const cleanCode = code.replace(/\s|-/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      errors.push('El código TOTP debe tener 6 dígitos');
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Datos de validación incorrectos',
      details: errors
    });
  }
  
  next();
};

export { 
  validateTicket, 
  validateLogin, 
  validatePasswordChange, 
  validateProfile, 
  validateSearchParams,
  validateTwoFactorSetup,
  validateTwoFactorVerification
};
