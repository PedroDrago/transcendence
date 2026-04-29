import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
