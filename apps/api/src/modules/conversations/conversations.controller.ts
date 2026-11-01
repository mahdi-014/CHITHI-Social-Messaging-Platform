import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('direct')
  @HttpCode(HttpStatus.OK)
  async getOrCreateDirect(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.conversationsService.getOrCreateDirectConversation(user.userId, dto.friendId);
  }

  @Get()
  async getMyConversations(@CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.getUserConversations(user.userId);
  }

  @Get(':id')
  async getConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationsService.getConversationById(user.userId, id);
  }
}
