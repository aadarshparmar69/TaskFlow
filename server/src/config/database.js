require('dotenv').config();
const path = require('path');
const fs = require('fs');

const nodeEnv = process.env.NODE_ENV || 'development';
const dbName = process.env.DB_NAME || 'p16_taskmanager';
const dialect = process.env.DB_DIALECT || 'sqlite';

function getStoragePath() {
  if (process.env.DB_STORAGE) return process.env.DB_STORAGE;

  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isServerless) {
    const tmpDb = '/tmp/taskflow.sqlite';
    // In Vercel serverless, /var/task is read-only. We must write to /tmp.
    if (!fs.existsSync(tmpDb)) {
      const candidates = [
        path.resolve(__dirname, '../../dev.sqlite'),
        path.resolve(__dirname, '../dev.sqlite'),
        path.resolve(process.cwd(), 'server/dev.sqlite'),
        path.resolve(process.cwd(), 'dev.sqlite'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            fs.copyFileSync(cand, tmpDb);
            break;
          } catch (_) {}
        }
      }
    }
    return tmpDb;
  }

  return path.resolve(__dirname, '../../dev.sqlite');
}

const base = dialect === 'sqlite' ? {
  dialect: 'sqlite',
  storage: getStoragePath(),
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
} : {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'changeme',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
    charset: 'utf8mb4',
  },
};

module.exports = {
  development: { ...base, database: dbName },
  test: { ...base, database: `${dbName}_test`, logging: false },
  production: { ...base, database: dbName, logging: false },
};
