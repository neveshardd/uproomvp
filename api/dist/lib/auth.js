"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const database_1 = require("./database");
const supabase_1 = require("./supabase");
const authHeaderSchema = zod_1.z.object({
    authorization: zod_1.z.string().regex(/^Bearer .+$/),
});
const authenticateUser = async (request, reply) => {
    try {
        const { authorization } = authHeaderSchema.parse(request.headers);
        const token = authorization.replace('Bearer ', '');
        console.log('Token recebido:', token.substring(0, 20) + '...');
        // Verificar token com Supabase
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            console.log('Token inválido ou usuário não encontrado:', error?.message);
            return reply.status(401).send({ error: 'Token inválido' });
        }
        // Buscar dados do usuário no banco local
        const dbUser = await database_1.prisma.user.findUnique({
            where: { id: user.id },
        });
        if (!dbUser) {
            console.log('Usuário não encontrado no banco local:', user.id);
            return reply.status(404).send({ error: 'Usuário não encontrado' });
        }
        console.log('Usuário autenticado:', { id: dbUser.id, email: dbUser.email });
        request.user = {
            id: dbUser.id,
            email: dbUser.email,
        };
    }
    catch (error) {
        console.error('Authentication error:', error);
        return reply.status(401).send({ error: 'Token de autenticação inválido' });
    }
};
exports.authenticateUser = authenticateUser;
//# sourceMappingURL=auth.js.map