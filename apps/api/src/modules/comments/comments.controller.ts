import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(user.userId, postId, dto);
  }

  @Get('posts/:id/comments')
  async getComments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) postId: string,
  ) {
    return this.commentsService.getComments(user.userId, postId);
  }

  @Delete('comments/:id')
  async deleteComment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) commentId: string,
  ) {
    return this.commentsService.deleteComment(user.userId, commentId);
  }
}
