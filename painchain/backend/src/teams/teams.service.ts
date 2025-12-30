import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Team, Prisma } from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.TeamCreateInput): Promise<Team> {
    return this.prisma.team.create({ data });
  }

  async findAll(tenantId?: string): Promise<Team[]> {
    return this.prisma.team.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId?: string): Promise<Team | null> {
    return this.prisma.team.findFirst({
      where: {
        id,
        ...(tenantId ? { tenantId } : {}),
      },
    });
  }

  async update(
    id: string,
    data: Prisma.TeamUpdateInput,
    tenantId?: string,
  ): Promise<Team> {
    return this.prisma.team.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, tenantId?: string): Promise<Team> {
    return this.prisma.team.delete({
      where: { id },
    });
  }
}
