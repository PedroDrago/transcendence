import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [PrometheusModule.register({
    // Configure your Prometheus options here
    defaultLabels: {
      app: 'transcendence-api-gateway',
    },
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
