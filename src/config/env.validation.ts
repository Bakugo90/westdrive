import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  CORS_WHITELIST: Joi.string().default('http://localhost:3001'),
  CORS_ALLOW_NO_ORIGIN: Joi.string().valid('true', 'false').default('true'),
  CORS_METHODS: Joi.string().default(
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  ),
  CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
  DATABASE_URL: Joi.string().uri().required(),
  DB_SSL: Joi.string().valid('true', 'false').default('false'),
  DB_RESET: Joi.string().valid('true', 'false').default('false'),
  JWT_ACCESS_SECRET: Joi.string()
    .min(16)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('dev_access_secret_change_me'),
    }),
  JWT_REFRESH_SECRET: Joi.string()
    .min(16)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('dev_refresh_secret_change_me'),
    }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  OTP_FIXED_ENABLED: Joi.string().valid('true', 'false').default('true'),
  OTP_FIXED_CODE: Joi.string()
    .pattern(/^\d{6}$/)
    .default('123456'),
  MAIL_ENABLED: Joi.string().valid('true', 'false').default('false'),
  MAIL_HOST: Joi.string().default('smtp.hostinger.com'),
  MAIL_PORT: Joi.number().integer().min(1).max(65535).default(587),
  MAIL_SECURE: Joi.string().valid('true', 'false').default('false'),
  MAIL_USER: Joi.string().allow('').default(''),
  MAIL_PASSWORD: Joi.string().allow('').default(''),
  MAIL_FROM_EMAIL: Joi.string().email().default('noreply@westdrive.fr'),
  MAIL_FROM_NAME: Joi.string().default('WestDrive'),
  CLOUDINARY_ENABLED: Joi.string().valid('true', 'false').default('false'),
  CLOUDINARY_CLOUD_NAME: Joi.string().when('CLOUDINARY_ENABLED', {
    is: 'true',
    then: Joi.required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  CLOUDINARY_API_KEY: Joi.string().when('CLOUDINARY_ENABLED', {
    is: 'true',
    then: Joi.required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  CLOUDINARY_API_SECRET: Joi.string().when('CLOUDINARY_ENABLED', {
    is: 'true',
    then: Joi.required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  CLOUDINARY_FOLDER: Joi.string().default('westdrive'),
  REGISTER_OTP_TTL_MINUTES: Joi.number().integer().min(1).default(10),
  PASSWORD_RESET_OTP_TTL_MINUTES: Joi.number().integer().min(1).default(10),
  ADMIN_EMAIL: Joi.string().email().default('admin@westdrive.fr'),
  ADMIN_PASSWORD: Joi.string().min(8).default('ChangeMeStrongPassword'),
  ADMIN_FIRST_NAME: Joi.string().default('WestDrive'),
  ADMIN_LAST_NAME: Joi.string().default('Admin'),
  ADMIN_PHONE: Joi.string().default('+33000000000'),
});
