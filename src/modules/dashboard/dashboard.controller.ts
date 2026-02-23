import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('traffic')
  async getTraffic(@Query('days') days?: string) {
    const numDays = days ? parseInt(days) : 30;
    return {
      daily: await this.dashboardService.getTrafficData(numDays),
    };
  }

  @Get('audit-logs')
  async getAuditLogs(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit) : 10;
    return this.dashboardService.getRecentAuditLogs(numLimit);
  }
}
