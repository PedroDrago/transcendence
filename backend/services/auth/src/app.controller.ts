import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
