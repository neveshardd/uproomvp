"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const env_1 = require("./lib/env");
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const client_1 = require("@prisma/client");
const auth_1 = require("./routes/auth");
const company_1 = require("./routes/company");
const conversation_1 = require("./routes/conversation");
const message_1 = require("./routes/message");
const invitation_1 = require("./routes/invitation");
const user_1 = require("./routes/user");
const presence_1 = require("./routes/presence");
const prisma = new client_1.PrismaClient();
const fastify = (0, fastify_1.default)({
    logger: {
        transport: {
            target: 'pino-pretty',
        }
    },
});
// Swagger configuration
fastify.register(swagger_1.default, {
    swagger: {
        info: {
            title: 'UpRoom API',
            description: 'API para o sistema UpRoom - Plataforma de comunicação empresarial',
            version: '1.0.0',
            contact: {
                name: 'UpRoom Team',
                email: 'support@uproom.com'
            }
        },
        host: env_1.env.NODE_ENV === 'production' ? 'api.uproom.com' : 'localhost:3333',
        schemes: env_1.env.NODE_ENV === 'production' ? ['https'] : ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
            { name: 'auth', description: 'Autenticação' },
            { name: 'companies', description: 'Empresas' },
            { name: 'conversations', description: 'Conversas' },
            { name: 'messages', description: 'Mensagens' },
            { name: 'invitations', description: 'Convites' },
            { name: 'users', description: 'Usuários' }
        ],
        securityDefinitions: {
            bearerAuth: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header',
                description: 'Token de autenticação no formato: Bearer {token}'
            }
        }
    }
});
fastify.register(swagger_ui_1.default, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: true
    },
    uiHooks: {
        onRequest: function (request, reply, next) { next(); },
        preHandler: function (request, reply, next) { next(); }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => { return swaggerObject; },
    transformSpecificationClone: true
});
// Configuração do CORS usando variáveis de ambiente
const corsOrigins = env_1.env.CORS_ORIGIN
    ? env_1.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : [
        'http://localhost:8080',
        'http://localhost:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5173',
        'https://uproom.com',
        'http://uproom.com',
        // Subdomínios locais para desenvolvimento
        /^http:\/\/[a-zA-Z0-9-]+\.localhost:8080$/,
        /^http:\/\/[a-zA-Z0-9-]+\.localhost:5173$/,
        /^http:\/\/[a-zA-Z0-9-]+\.127\.0\.0\.1:8080$/,
        /^http:\/\/[a-zA-Z0-9-]+\.127\.0\.0\.1:5173$/,
        // Subdomínios de produção
        /^https:\/\/[a-zA-Z0-9-]+\.uproom\.com$/,
        /^http:\/\/[a-zA-Z0-9-]+\.uproom\.com$/
    ];
fastify.register(cors_1.default, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-Client-Info',
        'apikey',
        'X-Supabase-Auth'
    ]
});
fastify.register(rate_limit_1.default, {
    max: env_1.env.RATE_LIMIT_MAX,
    timeWindow: env_1.env.RATE_LIMIT_TIME_WINDOW,
});
// Register routes
fastify.register(auth_1.authRoutes, { prefix: '/auth' });
fastify.register(company_1.companyRoutes, { prefix: '/companies' });
fastify.register(conversation_1.conversationRoutes, { prefix: '/conversations' });
fastify.register(message_1.messageRoutes, { prefix: '/messages' });
fastify.register(invitation_1.invitationRoutes, { prefix: '/invitations' });
fastify.register(user_1.userRoutes, { prefix: '/users' });
fastify.register(presence_1.presenceRoutes, { prefix: '/presence' });
// Health check
fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});
// Swagger JSON endpoint
fastify.get('/swagger.json', async () => {
    return fastify.swagger();
});
// Graceful shutdown
const gracefulShutdown = async () => {
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
const start = async () => {
    try {
        await fastify.listen({ port: env_1.env.PORT, host: '0.0.0.0' });
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map