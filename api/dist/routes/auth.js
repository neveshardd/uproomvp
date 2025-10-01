"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const supabase_1 = require("../lib/supabase");
const env_1 = require("../lib/env");
const signInSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const signUpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    fullName: zod_1.z.string().optional(),
});
const resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const updatePasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(6),
});
async function authRoutes(fastify) {
    // Login
    fastify.post('/signin', async (request, reply) => {
        try {
            const { email, password } = signInSchema.parse(request.body);
            const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                return reply.status(400).send({ error: error.message });
            }
            if (!data.user || !data.session) {
                return reply.status(400).send({ error: 'Falha na autenticação' });
            }
            // Criar ou atualizar usuário no banco local
            const user = await prisma_1.prisma.user.upsert({
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
        }
        catch (error) {
            console.error('Sign in error:', error);
            return reply.status(500).send({ error: 'Erro interno do servidor' });
        }
    });
    // Registro
    fastify.post('/signup', async (request, reply) => {
        try {
            const { email, password, fullName } = signUpSchema.parse(request.body);
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
                return reply.status(400).send({ error: error.message });
            }
            if (!data.user) {
                return reply.status(400).send({ error: 'Falha ao criar usuário' });
            }
            // Criar usuário no banco local
            const user = await prisma_1.prisma.user.create({
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
        }
        catch (error) {
            console.error('Sign up error:', error);
            return reply.status(500).send({ error: 'Erro interno do servidor' });
        }
    });
    // Logout
    fastify.post('/signout', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.status(401).send({ error: 'Token não fornecido' });
            }
            const token = authHeader.replace('Bearer ', '');
            const { error } = await supabase_1.supabase.auth.signOut();
            if (error) {
                return reply.status(400).send({ error: error.message });
            }
            return { message: 'Logout realizado com sucesso' };
        }
        catch (error) {
            console.error('Sign out error:', error);
            return reply.status(500).send({ error: 'Erro interno do servidor' });
        }
    });
    // Reset de senha
    fastify.post('/reset-password', async (request, reply) => {
        try {
            const { email } = resetPasswordSchema.parse(request.body);
            const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${env_1.env.FRONTEND_URL}/reset-password`,
            });
            if (error) {
                return reply.status(400).send({ error: error.message });
            }
            return { message: 'Email de recuperação enviado' };
        }
        catch (error) {
            console.error('Reset password error:', error);
            return reply.status(500).send({ error: 'Erro interno do servidor' });
        }
    });
    // Atualizar senha
    fastify.post('/update-password', async (request, reply) => {
        try {
            const { password } = updatePasswordSchema.parse(request.body);
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.status(401).send({ error: 'Token não fornecido' });
            }
            const token = authHeader.replace('Bearer ', '');
            const { error } = await supabase_1.supabase.auth.updateUser({
                password: password,
            });
            if (error) {
                return reply.status(400).send({ error: error.message });
            }
            return { message: 'Senha atualizada com sucesso' };
        }
        catch (error) {
            console.error('Update password error:', error);
            return reply.status(500).send({ error: 'Erro interno do servidor' });
        }
    });
    // Obter perfil do usuário
    fastify.get('/profile', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.status(401).send({ error: 'Token não fornecido' });
            }
            const token = authHeader.replace('Bearer ', '');
            // Verificar token com Supabase
            const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
            if (error || !user) {
                return reply.status(401).send({ error: 'Token inválido' });
            }
            // Buscar dados do usuário no banco local
            const dbUser = await prisma_1.prisma.user.findUnique({
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
                },
            };
        }
        catch (error) {
            console.error('Get profile error:', error);
            return reply.status(500).send({ error: 'Erro interno do servidor' });
        }
    });
    // Verificar sessão
    fastify.get('/session', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.status(401).send({ error: 'Token não fornecido' });
            }
            const token = authHeader.replace('Bearer ', '');
            const { data: { session }, error } = await supabase_1.supabase.auth.getSession();
            if (error || !session) {
                return reply.status(401).send({ error: 'Sessão inválida' });
            }
            return { session };
        }
        catch (error) {
            console.error('Get session error:', error);
            return reply.status(500).send({ error: 'Erro interno do servidor' });
        }
    });
}
//# sourceMappingURL=auth.js.map