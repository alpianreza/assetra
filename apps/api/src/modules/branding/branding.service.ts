import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BrandingService {
  constructor(private readonly prisma: PrismaService) {}

  async getBranding() {
    const org = await this.prisma.organization.findFirst();
    return {
      name: org?.name ?? 'Assetra',
      shortName: org?.shortName ?? 'Assetra',
      logoUrl: org?.logoPath ? `/api/v1/storage/${org.logoPath}` : null,
      address: org?.address,
      phone: org?.phone,
      email: org?.email,
      website: org?.website,
      reportFooter: org?.reportFooter,
    };
  }
}
