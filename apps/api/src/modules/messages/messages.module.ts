import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { FriendshipsModule } from '../friendships/friendships.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [FriendshipsModule, forwardRef(() => RealtimeModule)],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
