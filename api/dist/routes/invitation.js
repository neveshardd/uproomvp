"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitationRoutes = invitationRoutes;
const zod_1 = require("zod");
const database_1 = require("../lib/database");
const auth_1 = require("../lib/auth");
const createInvitationSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    companyId: zod_1.z.string(),
    role: zod_1.z.enum(['MEMBER', 'ADMIN']).optional().default('MEMBER'),
});
const acceptInvitationSchema = zod_1.z.object({
    token: zod_1.z.string(),
});
async function invitationRoutes(fastify) {
    // Criar convite
    fastify.post('/', {
        preHandler: auth_1.authenticateUser,
    }, async (request, reply) => {
        try {
            const { email, companyId, role } = createInvitationSchema.parse(request.body);
            // @ts-expect-error: 'user' é adicionado pelo middleware authenticateUser
            const userId = request.user.id;
            // Verificar se o usuário é owner/admin da empresa
            const membership = await database_1.prisma.companyMember.findFirst({
                where: {
                    companyId,
                    userId,
                    role: { in: ['OWNER', 'ADMIN'] },
                },
            });
            if (!membership) {
                return reply.status(403).send({ error: 'Acesso negado' });
            }
            // Verificar se o usuário já é membro
            const existingUser = await database_1.prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                const existingMembership = await database_1.prisma.companyMember.findFirst({
                    where: {
                        companyId,
                        userId: existingUser.id,
                    },
                });
                if (existingMembership) {
                    return reply.status(400).send({ error: 'Usuário já é membro da empresa' });
                }
            }
            // Verificar se já existe convite pendente
            const existingInvitation = await database_1.prisma.invitation.findFirst({
                where: {
                    email,
                    companyId,
                    status: 'PENDING',
                },
            });
            if (existingInvitation) {
                return reply.status(400).send({ error: 'Convite já enviado para este email' });
            }
            const invitation = await database_1.prisma.invitation.create({
                data: {
                    email,
                    companyId,
                    role,
                    invitedById: userId,
                    token: crypto.randomUUID(),
                },
            });
            // Aqui você enviaria o email com o link de convite
            // const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitation.token}`;
            // await sendInvitationEmail(email, inviteLink);
            return { invitation };
        }
        catch (error) {
            return reply.status(400).send({ error: 'Dados inválidos' });
        }
    });
    // Listar convites da empresa
    fastify.get('/company/:companyId', {
        preHandler: auth_1.authenticateUser,
    }, async (request, reply) => {
        try {
            const { companyId } = request.params;
            // @ts-expect-error: 'user' é adicionado pelo middleware authenticateUser
            const userId = request.user.id;
            // Verificar se o usuário é membro da empresa
            const membership = await database_1.prisma.companyMember.findFirst({
                where: {
                    companyId,
                    userId,
                },
            });
            if (!membership) {
                return reply.status(403).send({ error: 'Acesso negado' });
            }
            const invitations = await database_1.prisma.invitation.findMany({
                where: { companyId },
                include: {
                    invitedBy: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            return { invitations };
        }
        catch (error) {
            return reply.status(500).send({ error: 'Erro interno' });
        }
    });
    // Aceitar convite
    fastify.post('/accept', async (request, reply) => {
        try {
            const { token } = acceptInvitationSchema.parse(request.body);
            const invitation = await database_1.prisma.invitation.findUnique({
                where: { token },
                include: {
                    company: true,
                },
            });
            if (!invitation) {
                return reply.status(404).send({ error: 'Convite não encontrado' });
            }
            if (invitation.status !== 'PENDING') {
                return reply.status(400).send({ error: 'Convite já foi processado' });
            }
            // Verificar se o convite não expirou (exemplo: 7 dias)
            const expirationDate = new Date(invitation.createdAt);
            expirationDate.setDate(expirationDate.getDate() + 7);
            if (new Date() > expirationDate) {
                return reply.status(400).send({ error: 'Convite expirado' });
            }
            // Aqui você precisaria do ID do usuário que está aceitando o convite
            // Como estamos usando Supabase Auth, você precisaria validar o token JWT
            // e extrair o user ID dele
            const userId = 'user-id-from-jwt-token'; // Substitua pela validação real
            // Adicionar usuário à empresa
            await database_1.prisma.companyMember.create({
                data: {
                    companyId: invitation.companyId,
                    userId,
                    role: invitation.role,
                },
            });
            // Marcar convite como aceito
            await database_1.prisma.invitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED' },
            });
            return { success: true, company: invitation.company };
        }
        catch (error) {
            return reply.status(400).send({ error: 'Dados inválidos' });
        }
    });
    // Cancelar convite
    fastify.delete('/:id', {
        preHandler: auth_1.authenticateUser,
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            // @ts-expect-error: 'user' é adicionado pelo middleware authenticateUser
            const userId = request.user.id;
            const invitation = await database_1.prisma.invitation.findFirst({
                where: {
                    id,
                    invitedById: userId,
                },
            });
            if (!invitation) {
                return reply.status(404).send({ error: 'Convite não encontrado' });
            }
            await database_1.prisma.invitation.delete({
                where: { id },
            });
            return { success: true };
        }
        catch (error) {
            return reply.status(500).send({ error: 'Erro interno' });
        }
    });
}
//# sourceMappingURL=invitation.js.map