require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const pinoHttp = require('pino-http');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const { corsOrigins, apiPrefix } = require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const { globalLimiter } = require('./middleware/rateLimiters');
const sanitizeInput = require('./middleware/sanitize');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Trust reverse proxy (needed for rate-limit IP detection)
app.set('trust proxy', 1);

// Attach request ID to every request
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
});

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (
        corsOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        (process.env.VERCEL_URL && origin.includes(process.env.VERCEL_URL))
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
  }),
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Security: HTTP parameter pollution
app.use(hpp());

// Input sanitization
app.use(sanitizeInput);

// HTTP request logging (skip health/ready endpoints to reduce noise)
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === `${apiPrefix}/health` || req.url === `${apiPrefix}/ready`,
    },
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);

// Global rate limiter
app.use(apiPrefix, globalLimiter);

// Ensure database tables and demo seed data exist (essential for Vercel/serverless cold starts)
let dbBootstrapPromise = null;
app.use(async (req, res, next) => {
  try {
    if (!dbBootstrapPromise) {
      dbBootstrapPromise = (async () => {
        const { sequelize, User } = require('./models');
        await sequelize.authenticate();
        await sequelize.sync();
        const count = await User.count().catch(() => 0);
        if (count === 0) {
          const queryInterface = sequelize.getQueryInterface();
          const seeders = [
            require('./seeders/20260101000001-demo-users'),
            require('./seeders/20260101000002-demo-workspaces'),
            require('./seeders/20260101000003-demo-boards'),
            require('./seeders/20260101000004-demo-cards'),
          ];
          for (const s of seeders) {
            try {
              if (s && s.up) await s.up(queryInterface, sequelize.Sequelize);
            } catch (seedErr) {
              console.warn('Auto-seed notice:', seedErr.message);
            }
          }
        }
      })();
    }
    await dbBootstrapPromise;
    next();
  } catch (err) {
    console.error('Database bootstrap error:', err.message);
    next();
  }
});

// API routes
app.use(apiPrefix, routes);

// GraphQL endpoint — lazily initialized on first request for serverless/Vercel compatibility
let gqlMiddlewarePromise = null;
app.use('/graphql', express.json(), async (req, res, next) => {
  try {
    if (!gqlMiddlewarePromise) {
      const createGraphQLMiddleware = require('./graphql');
      gqlMiddlewarePromise = createGraphQLMiddleware();
    }
    const gqlMiddleware = await gqlMiddlewarePromise;
    return gqlMiddleware(req, res, next);
  } catch (err) {
    next(err);
  }
});

// 404 handler (must be before errorHandler)
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

/**
 * Mount the GraphQL middleware after Apollo Server has started.
 * Called from server.js after http server creation (or pre-warmed).
 */
app.initGraphQL = async function () {
  try {
    if (!gqlMiddlewarePromise) {
      const createGraphQLMiddleware = require('./graphql');
      gqlMiddlewarePromise = createGraphQLMiddleware();
    }
    await gqlMiddlewarePromise;
    logger.info('GraphQL endpoint ready at /graphql');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize GraphQL');
  }
};

module.exports = app;

