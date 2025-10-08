import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { requireAuth, AuthenticatedRequest } from '../lib/session-middleware';

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50, 'Subdomain must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Subdomain cannot start or end with a hyphen'),
  description: z.string().optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function companyRoutes(fastify: FastifyInstance) {
  // Endpoint de teste para debug
  fastify.post('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    return { message: 'Test successful', body: request.body };
  });

  // Endpoint temporário para corrigir membros faltantes
  fastify.post('/fix-members', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as AuthenticatedRequest).user.id;

      // Buscar todas as empresas onde o usuário é owner mas não é membro
      const companies = await prisma.company.findMany({
        where: {
          ownerId: userId,
        },
        include: {
          members: {
            where: {
              userId,
            },
          },
        },
      });

      const fixed = [];
      
      for (const company of companies) {
        if (company.members.length === 0) {
          // Criar o registro de membro faltante
          const member = await prisma.companyMember.create({
            data: {
              companyId: company.id,
              userId,
              role: 'OWNER',
            },
          });
          
          fixed.push({
            companyId: company.id,
            companyName: company.name,
            memberId: member.id,
          });
        }
      }

      return { 
        message: 'Members fixed successfully',
        fixed,
      };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to fix members' });
    }
  });

  // Criar empresa
  fastify.post('/', {
    preHandler: requireAuth,
    schema: {
      tags: ['companies'],
      summary: 'Criar nova empresa',
      description: 'Cria uma nova empresa com o usuário autenticado como proprietário',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'subdomain'],
        properties: {
          name: {
            type: 'string',
            description: 'Nome da empresa'
          },
          subdomain: {
            type: 'string',
            description: 'Subdomínio único para a empresa',
            pattern: '^[a-z0-9-]+$'
          },
          description: {
            type: 'string',
            description: 'Descrição opcional da empresa'
          }
        }
      },
      response: {
        200: {
          description: 'Empresa criada com sucesso',
          type: 'object',
          properties: {
            company: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                subdomain: { type: 'string' },
                description: { type: 'string' },
                ownerId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        400: {
          description: 'Dados inválidos',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
          }
        },
        401: {
          description: 'Token de autenticação inválido',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      
      // Validar cada campo individualmente para debug
      const body = request.body as any;
      
      // Validar schema com tratamento de erro detalhado
      let validatedData;
      try {
        validatedData = createCompanySchema.parse(request.body);
      } catch (validationError: any) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validationError.errors || validationError.message
        });
      }
      
      const { name, subdomain, description } = validatedData;
      const userId = (request as AuthenticatedRequest).user.id;

      // Verificar se o subdomínio já existe
      const existingCompany = await prisma.company.findUnique({
        where: { subdomain },
      });

      if (existingCompany) {
        return reply.status(400).send({ error: 'Subdomínio já está em uso' });
      }

      const company = await prisma.company.create({
        data: {
          name,
          subdomain,
          description,
          ownerId: userId,
        },
      });

      // Adicionar o criador como membro com role OWNER
      const member = await prisma.companyMember.create({
        data: {
          companyId: company.id,
          userId,
          role: 'OWNER',
        },
      });

      return { company };
    } catch (error) {
      return reply.status(400).send({ error: 'Dados inválidos', details: (error as Error).message });
    }
  });

  // Listar empresas do usuário
  fastify.get('/', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as AuthenticatedRequest).user.id;

      const companies = await prisma.company.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      });

      return { companies: companies || [] };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno', details: (error as Error).message });
    }
  });

  // Listar empresas do usuário por ID
  fastify.get('/user/:userId', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string };
      
      // Verificar se o usuário está tentando acessar suas próprias empresas
      if ((request as AuthenticatedRequest).user.id !== userId) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      const companies = await prisma.company.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },
        },
        include: {
          members: {
            where: {
              userId,
            },
            include: {
              user: true,
            },
          },
        },
      });

      // Adicionar role do usuário em cada empresa
      const companiesWithRole = companies.map(company => ({
        ...company,
        userRole: company.members[0]?.role || 'MEMBER',
        isOwner: company.ownerId === userId,
      }));

      return { companies: companiesWithRole || [] };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno', details: (error as Error).message });
    }
  });

  // Obter empresa por ID
  fastify.get('/:id', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as AuthenticatedRequest).user.id;

      const company = await prisma.company.findFirst({
        where: {
          id,
          members: {
            some: {
              userId,
            },
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!company) {
        return reply.status(404).send({ error: 'Empresa não encontrada' });
      }

      return { company };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno' });
    }
  });

  // Atualizar empresa
  fastify.put('/:id', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as AuthenticatedRequest).user.id;
      const updateData = updateCompanySchema.parse(request.body);

      // Verificar se o usuário é owner da empresa
      const membership = await prisma.companyMember.findFirst({
        where: {
          companyId: id,
          userId,
          role: 'OWNER',
        },
      });

      if (!membership) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      const company = await prisma.company.update({
        where: { id },
        data: updateData,
      });

      return { company };
    } catch (error) {
      return reply.status(400).send({ error: 'Dados inválidos' });
    }
  });

  // Verificar disponibilidade de subdomínio
  fastify.get('/check-subdomain/:subdomain', {
    schema: {
      tags: ['companies'],
      summary: 'Verificar disponibilidade de subdomínio',
      description: 'Verifica se um subdomínio está disponível para uso',
      params: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: {
            type: 'string',
            description: 'Subdomínio a ser verificado',
          }
        }
      },
      response: {
        200: {
          description: 'Resultado da verificação',
          type: 'object',
          properties: {
            available: {
              type: 'boolean',
              description: 'Indica se o subdomínio está disponível'
            }
          }
        },
        500: {
          description: 'Erro interno do servidor',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { subdomain } = request.params as { subdomain: string };

      if (!subdomain || subdomain.trim() === '') {
        return reply.status(400).send({ error: 'Subdomínio é obrigatório' });
      }

      const existingCompany = await prisma.company.findUnique({
        where: { subdomain: subdomain.trim() },
      });

      return { available: !existingCompany };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno', details: (error as Error).message });
    }
  });

  // Buscar empresa por subdomínio (com verificação de acesso)
  fastify.get('/by-subdomain/:subdomain', {
    preHandler: requireAuth,
    schema: {
      tags: ['companies'],
      summary: 'Buscar empresa por subdomínio com verificação de acesso',
      description: 'Busca uma empresa pelo seu subdomínio e verifica se o usuário tem acesso',
      params: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: {
            type: 'string',
            description: 'Subdomínio da empresa',
          }
        }
      },
      response: {
        200: {
          description: 'Empresa encontrada',
          type: 'object',
          properties: {
            company: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                subdomain: { type: 'string' },
                description: { type: 'string' },
                ownerId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                members: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      role: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: 'string' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        403: {
          description: 'Acesso negado',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        404: {
          description: 'Empresa não encontrada',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          description: 'Erro interno do servidor',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { subdomain } = request.params as { subdomain: string };
      const userId = (request as AuthenticatedRequest).user.id;
      
      if (!subdomain || subdomain.trim() === '') {
        return reply.status(400).send({ error: 'Subdomínio é obrigatório' });
      }

      const company = await prisma.company.findUnique({
        where: { subdomain: subdomain.trim() },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  fullName: true
                }
              }
            }
          }
        }
      });

      if (!company) {
        return reply.status(404).send({ error: 'Empresa não encontrada' });
      }

      // Verificar se o usuário é membro da empresa
      const membership = company.members.find(member => member.userId === userId);
      if (!membership) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      return { company };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno', details: (error as Error).message });
    }
  });

  // Buscar empresa por subdomínio
  fastify.get('/subdomain/:subdomain', {
    schema: {
      tags: ['companies'],
      summary: 'Buscar empresa por subdomínio',
      description: 'Busca uma empresa pelo seu subdomínio único',
      params: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: {
            type: 'string',
            description: 'Subdomínio da empresa',
          }
        }
      },
      response: {
        200: {
          description: 'Empresa encontrada',
          type: 'object',
          properties: {
            company: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                subdomain: { type: 'string' },
                description: { type: 'string' },
                ownerId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                members: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      role: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: 'string' },
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Empresa não encontrada',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          description: 'Erro interno do servidor',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { subdomain } = request.params as { subdomain: string };
      
      if (!subdomain || subdomain.trim() === '') {
        return reply.status(400).send({ error: 'Subdomínio é obrigatório' });
      }

      const company = await prisma.company.findUnique({
        where: { subdomain: subdomain.trim() },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!company) {
        return reply.status(404).send({ error: 'Empresa não encontrada' });
      }

      return { company };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno', details: (error as Error).message });
    }
  });

  // Get company members
  fastify.get('/:id/members', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as AuthenticatedRequest).user.id;

      // Verificar se o usuário é membro da empresa
      const membership = await prisma.companyMember.findFirst({
        where: {
          companyId: id,
          userId,
        },
      });

      if (!membership) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      const members = await prisma.companyMember.findMany({
        where: { companyId: id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      });

      return { members };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno' });
    }
  });

  // Get user role in company
  fastify.get('/:id/members/:userId/role', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id, userId } = request.params as { id: string; userId: string };
      const authenticatedUserId = (request as AuthenticatedRequest).user.id;

      // Verificar se o usuário autenticado é membro da empresa
      const membership = await prisma.companyMember.findFirst({
        where: {
          companyId: id,
          userId: authenticatedUserId,
        },
      });

      if (!membership) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      // Buscar o role do usuário solicitado
      const userMembership = await prisma.companyMember.findFirst({
        where: {
          companyId: id,
          userId,
        },
      });

      if (!userMembership) {
        return reply.status(404).send({ error: 'Usuário não é membro desta empresa' });
      }

      return { role: userMembership.role };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno' });
    }
  });

  // Get current user role in company (the missing route)
  fastify.get('/:id/user-role', {
    preHandler: requireAuth,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as AuthenticatedRequest).user.id;

      // Buscar o role do usuário autenticado nesta empresa
      const membership = await prisma.companyMember.findFirst({
        where: {
          companyId: id,
          userId,
        },
      });

      if (!membership) {
        return reply.status(404).send({ error: 'Usuário não é membro desta empresa' });
      }

      return { role: membership.role };
    } catch (error) {
      return reply.status(500).send({ error: 'Erro interno' });
    }
  });
}
