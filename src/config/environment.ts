export const environment = import.meta.env.MODE || 'development';
export const isDev = environment === 'development';
export const isProd = environment === 'production';

export const config = {
  environment,
  isDev,
  isProd,
};

export default config;