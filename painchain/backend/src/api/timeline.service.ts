import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface TimelineFilters {
  tenantId?: string;
  connector?: string;
  project?: string;
  tags?: string[];
  limit?: number;
}

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  async getTimeline(filters: TimelineFilters) {
    // If tags are specified, find repositories from integration configs
    let projectNames: string[] | undefined;
    if (filters.tags && filters.tags.length > 0) {
      // Get all integrations
      const integrations = await this.prisma.integration.findMany({
        where: filters.connector ? { type: filters.connector } : {},
      });

      // Extract repository names that have any of the specified tags
      const repoSet = new Set<string>();
      for (const integration of integrations) {
        const config = integration.config as any;
        if (config?.repositories && Array.isArray(config.repositories)) {
          for (const repo of config.repositories) {
            if (repo.tags && Array.isArray(repo.tags)) {
              // Check if repo has any of the specified tags
              const hasMatchingTag = filters.tags.some(tag => repo.tags.includes(tag));
              if (hasMatchingTag) {
                // Construct full repository name as owner/repo
                const fullRepoName = repo.owner && repo.repo
                  ? `${repo.owner}/${repo.repo}`
                  : repo.name || repo.repository;

                if (fullRepoName) {
                  repoSet.add(fullRepoName);
                }
              }
            }
          }
        }
      }

      projectNames = Array.from(repoSet);

      // If no repositories match the tags, return empty results
      if (projectNames.length === 0) {
        return {
          events: [],
          total: 0,
        };
      }
    }

    const events = await this.prisma.event.findMany({
      where: {
        ...(filters.tenantId !== undefined
          ? { tenantId: filters.tenantId }
          : {}),
        ...(filters.connector ? { connector: filters.connector } : {}),
        ...(filters.project ? { project: filters.project } : {}),
        ...(projectNames ? { project: { in: projectNames } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 50,
    });

    return {
      events,
      total: events.length,
    };
  }
}
