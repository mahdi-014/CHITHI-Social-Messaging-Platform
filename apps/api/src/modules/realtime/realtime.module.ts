import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { RealtimeGateway } from './realtime.gateway';
import { MessagesModule } from '../messages/messages.module';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => CallsModule),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
