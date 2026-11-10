'use strict';

const { ApolloServer, HeaderMap } = require('@apollo/server');
const depthLimit = require('graphql-depth-limit');
const typeDefs = require('./typeDefs/schema');
const resolvers = require('./resolvers');
const { buildContext } = require('./context');

/**
 * Universal Express middleware for Apollo Server (compatible with Apollo Server v4 & v5)
 */
function createExpressMiddleware(server, options) {
  return async function (req, res, next) {
    try {
      const headers = new HeaderMap();
      for (const [key, value] of Object.entries(req.headers || {})) {
        if (value) {
          headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
      }

      const context = options?.context
        ? await options.context({ req, res })
        : undefined;

      const httpGraphQLResponse = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: {
          method: (req.method || 'POST').toUpperCase(),
          headers,
          search: req.url && req.url.includes('?') ? req.url.split('?')[1] : '',
          body: req.body,
        },
        context: async () => context,
      });

      res.status(httpGraphQLResponse.status || 200);

      for (const [key, value] of httpGraphQLResponse.headers) {
        res.setHeader(key, value);
      }

      if (httpGraphQLResponse.body.kind === 'complete') {
        res.send(httpGraphQLResponse.body.string);
        return;
      }

      for await (const chunk of httpGraphQLResponse.body.asyncIterator) {
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Create and start Apollo Server, return Express middleware.
 * @returns {Promise<Function>} Express middleware to mount at /graphql
 */
async function createGraphQLMiddleware() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    validationRules: [depthLimit(10)],
    formatError: (formattedError, error) => {
      // Hide internal server errors in production
      if (process.env.NODE_ENV === 'production' && formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return { message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } };
      }
      return formattedError;
    },
    introspection: process.env.NODE_ENV !== 'production',
    plugins: [
      {
        async requestDidStart() {
          return {
            async didEncounterErrors({ errors }) {
              errors.forEach((err) => {
                if (err.originalError) {
                  require('../config/logger').error({ err }, 'GraphQL error');
                }
              });
            },
          };
        },
      },
    ],
  });

  await server.start();

  return createExpressMiddleware(server, {
    context: buildContext,
  });
}

module.exports = createGraphQLMiddleware;
