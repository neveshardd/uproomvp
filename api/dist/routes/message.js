"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRoutes = messageRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const createMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
    conversationId: zod_1.z.string(),
    type: zod_1.z.enum(['TEXT', 'IMAGE', 'FILE']).optional().default('TEXT'),
});
const updateMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
});
async function messageRoutes(fastify) {
    // Criar mensagem
    fastify.post('/', {
        preHandler: auth_1.authenticateUser,
    }, async (request, reply) => {
        try {
            const { content, conversationId, type } = createMessageSchema.parse(request.body);
            // @ts-expect-error: 'user' é adicionado pelo middleware authenticateUser
            const userId = request.user.id;
            // Verificar se o usuário é participante da conversa
            const participation = await prisma_1.prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId,
                },
            });
            if (!participation) {
                return reply.status(403).send({ error: 'Acesso negado' });
            }
            const message = await prisma_1.prisma.message.create({
                data: {
                    content,
                    conversationId,
                    userId,
                    type,
                },
                include: {
                    user: true,
                },
            });
            // Atualizar timestamp da conversa
            await prisma_1.prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            });
            return { message };
        }
        catch (error) {
            return reply.status(400).send({ error: 'Dados inválidos' });
        }
    });
    // Listar mensagens de uma conversa
    fastify.get('/conversation/:conversationId', {
        preHandler: auth_1.authenticateUser,
    }, async (request, reply) => {
        try {
            const { conversationId } = request.params;
            const { page = '1', limit = '50' } = request.query;
            // @ts-expect-error: 'user' é adicionado pelo middleware authenticateUser
            const userId = request.user.id;
            // Verificar se o usuário é participante da conversa
            const participation = await prisma_1.prisma.conversationParticipant.findFirst({
                where: {
                    conversationId,
                    userId,
                },
            });
            if (!participation) {
                return reply.status(403).send({ error: 'Acesso negado' });
            }
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            const messages = await prisma_1.prisma.message.findMany({
                where: { conversationId },
                include: {
                    user: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            });
            const total = await prisma_1.prisma.message.count({
                where: { conversationId },
            });
            return {
                messages: messages.reverse(),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            };
        }
        catch (error) {
            return reply.status(500).send({ error: 'Erro interno' });
        }
    });
    // Obter mensagem por ID
    fastify.get('/:id', {
        preHandler: auth_1.authenticateUser,
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            // @ts-expect-error: 'user' é adicionado pelo middleware authenticateUser
            const userId = request.user.id;
            const message = await prisma_1.prisma.message.findFirst({
                where: {
                    id,
                    conversation: {
                        participants: {
                            some: {
                                userId,
                            },
                        },
                    },
                },
                include: {
                    user: true,
                },
            });
            if (!message) {
                return reply.status(404).send({ error: 'Mensagem não encontrada' });
            }
            return { message };
        }
        catch (error) {
            return reply.status(500).send({ error: 'Erro interno' });
        }
    });
    // Atualizar mensagem
    fastify.put('/:id', {
        preHandler: auth_1.authenticateUser,
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            // @ts-expect-error: 'user' é adicionado pelo middleware authenticateUser
            const userId = request.user.id;
            const { content } = updateMessageSchema.parse(request.body);
            const message = await prisma_1.prisma.message.findFirst({
                where: {
                    id,
                    userId,
                },
            });
            if (!message) {
                return reply.status(404).send({ error: 'Mensagem não encontrada' });
            }
            const updatedMessage = await prisma_1.prisma.message.update({
                where: { id },
                data: { content },
                include: {
                    user: true,
                },
            });
            return { message: updatedMessage };
        }
        catch (error) {
            return reply.status(400).send({ error: 'Dados inválidos' });
        }
    });
    // Deletar mensagem
    fastify.delete('/:id', {
        preHandler: auth_1.authenticateUser,
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            // @ts-expect-error: 'user' é adicionado pelo middleware authenticateUser
            const userId = request.user.id;
            const message = await prisma_1.prisma.message.findFirst({
                where: {
                    id,
                    userId,
                },
            });
            if (!message) {
                return reply.status(404).send({ error: 'Mensagem não encontrada' });
            }
            await prisma_1.prisma.message.delete({
                where: { id },
            });
            return { success: true };
        }
        catch (error) {
            return reply.status(500).send({ error: 'Erro interno' });
        }
    });
}
//# sourceMappingURL=message.js.map