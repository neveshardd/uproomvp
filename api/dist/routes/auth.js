"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const database_1 = require("../lib/database");
const supabase_1 = require("../lib/supabase");
const config_1 = require("../lib/config");
const validation_1 = require("../lib/validation");
const errors_1 = require("../lib/errors");
async function authRoutes(fastify) {
    // Login otimizado
    fastify.post('/signin', (0, errors_1.withErrorHandling)(async (request, reply) => {
        const { email, password } = (0, validation_1.validateData)(validation_1.signInSchema, request.body);
        const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            throw new errors_1.AuthenticationError(error.message);
        }
        if (!data.user || !data.session) {
            throw new errors_1.AuthenticationError('Falha na autenticação');
        }
        // Criar ou atualizar usuário no banco local
        const user = await database_1.prisma.user.upsert({
            where: { id: data.user.id },
            update: {
                email: data.user.email,
                fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
                avatar: data.user.user_metadata?.avatar_url,
            },
            create: {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
                avatar: data.user.user_metadata?.avatar_url,
                password: '', // Não precisamos armazenar senha com Supabase
            },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                avatar: user.avatar,
            },
            session: data.session,
        };
    }));
    // Registro otimizado
    fastify.post('/signup', (0, errors_1.withErrorHandling)(async (request, reply) => {
        const { email, password, fullName } = (0, validation_1.validateData)(validation_1.signUpSchema, request.body);
        const { data, error } = await supabase_1.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
        if (error) {
            throw new errors_1.AuthenticationError(error.message);
        }
        if (!data.user) {
            throw new errors_1.AuthenticationError('Falha ao criar usuário');
        }
        // Criar usuário no banco local
        const user = await database_1.prisma.user.create({
            data: {
                id: data.user.id,
                email: data.user.email,
                fullName: fullName,
                password: '', // Não precisamos armazenar senha com Supabase
            },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
            },
            requiresConfirmation: !data.session,
            message: data.session ? 'Conta criada com sucesso' : 'Verifique seu email para confirmar a conta',
        };
    }));
    // Logout otimizado
    fastify.post('/signout', (0, errors_1.withErrorHandling)(async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AuthenticationError('Token não fornecido');
        }
        const { error } = await supabase_1.supabase.auth.signOut();
        if (error) {
            throw new errors_1.AuthenticationError(error.message);
        }
        return { message: 'Logout realizado com sucesso' };
    }));
    // Reset de senha otimizado
    fastify.post('/reset-password', (0, errors_1.withErrorHandling)(async (request, reply) => {
        const { email } = (0, validation_1.validateData)(validation_1.resetPasswordSchema, request.body);
        const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${config_1.config.FRONTEND_URL}/reset-password`,
        });
        if (error) {
            throw new errors_1.AuthenticationError(error.message);
        }
        return { message: 'Email de recuperação enviado' };
    }));
    // Atualizar senha otimizado
    fastify.post('/update-password', (0, errors_1.withErrorHandling)(async (request, reply) => {
        const { password } = (0, validation_1.validateData)(validation_1.updatePasswordSchema, request.body);
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AuthenticationError('Token não fornecido');
        }
        const { error } = await supabase_1.supabase.auth.updateUser({
            password: password,
        });
        if (error) {
            throw new errors_1.AuthenticationError(error.message);
        }
        return { message: 'Senha atualizada com sucesso' };
    }));
    // Obter perfil do usuário otimizado
    fastify.get('/profile', (0, errors_1.withErrorHandling)(async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AuthenticationError('Token não fornecido');
        }
        const token = authHeader.replace('Bearer ', '');
        // Verificar token com Supabase
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            throw new errors_1.AuthenticationError('Token inválido');
        }
        // Buscar dados do usuário no banco local
        const dbUser = await database_1.prisma.user.findUnique({
            where: { id: user.id },
        });
        if (!dbUser) {
            return reply.status(404).send({ error: 'Usuário não encontrado' });
        }
        return {
            user: {
                id: dbUser.id,
                email: dbUser.email,
                fullName: dbUser.fullName,
                avatar: dbUser.avatar,
                createdAt: dbUser.createdAt,
            },
        };
    }));
    // Verificar sessão otimizado
    fastify.get('/session', (0, errors_1.withErrorHandling)(async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new errors_1.AuthenticationError('Token não fornecido');
        }
        const { data: { session }, error } = await supabase_1.supabase.auth.getSession();
        if (error || !session) {
            throw new errors_1.AuthenticationError('Sessão inválida');
        }
        return { session };
    }));
}
//# sourceMappingURL=auth.js.map