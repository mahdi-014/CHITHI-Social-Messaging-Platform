import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(user.userId, conversationId, dto);
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    return this.messagesService.getMessages(user.userId, conversationId, cursor, limitNum);
  }

  @Post('messages/:id/receipt')
  @HttpCode(HttpStatus.OK)
  async updateReceipt(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body('status') status: 'delivered' | 'read',
  ) {
    return this.messagesService.updateReceipt(user.userId, messageId, status);
  }

  @Patch('messages/:id')
  async editMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body('body') body: string,
  ) {
    return this.messagesService.editMessage(user.userId, messageId, body);
  }

  @Delete('messages/:id')
  async deleteMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) messageId: string,
  ) {
    return this.messagesService.deleteMessage(user.userId, messageId);
  }

  @Post('messages/:id/reactions')
  @HttpCode(HttpStatus.OK)
  async reactToMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body('reaction') reaction: string,
  ) {
    return this.messagesService.toggleReaction(user.userId, messageId, reaction);
  }
}
