import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { supabase } from '../lib/supabase';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

const updatePasswordSchema = z.object({
  password: z.string().min(6),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/signin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = signInSchema.parse(request.body);

      const { data, error } = await supabase.auth.signInWithPassword({
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
      const user = await prisma.user.upsert({
        where: { id: data.user.id },
        update: { 
          email: data.user.email!,
          fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          avatar: data.user.user_metadata?.avatar_url,
        },
        create: { 
          id: data.user.id,
          email: data.user.email!,
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
    } catch (error) {
      console.error('Sign in error:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Registro
  fastify.post('/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password, fullName } = signUpSchema.parse(request.body);

      const { data, error } = await supabase.auth.signUp({
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
      const user = await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
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
    } catch (error) {
      console.error('Sign up error:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Logout
  fastify.post('/signout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token não fornecido' });
      }

      const token = authHeader.replace('Bearer ', '');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return { message: 'Logout realizado com sucesso' };
    } catch (error) {
      console.error('Sign out error:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Reset de senha
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = resetPasswordSchema.parse(request.body);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
      });

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return { message: 'Email de recuperação enviado' };
    } catch (error) {
      console.error('Reset password error:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Atualizar senha
  fastify.post('/update-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { password } = updatePasswordSchema.parse(request.body);
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token não fornecido' });
      }

      const token = authHeader.replace('Bearer ', '');
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return { message: 'Senha atualizada com sucesso' };
    } catch (error) {
      console.error('Update password error:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Obter perfil do usuário
  fastify.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token não fornecido' });
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verificar token com Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return reply.status(401).send({ error: 'Token inválido' });
      }

      // Buscar dados do usuário no banco local
      const dbUser = await prisma.user.findUnique({
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
    } catch (error) {
      console.error('Get profile error:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Verificar sessão
  fastify.get('/session', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token não fornecido' });
      }

      const token = authHeader.replace('Bearer ', '');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return reply.status(401).send({ error: 'Sessão inválida' });
      }

      return { session };
    } catch (error) {
      console.error('Get session error:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}
