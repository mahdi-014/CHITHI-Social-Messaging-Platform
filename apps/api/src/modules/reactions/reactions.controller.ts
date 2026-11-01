import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('posts')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post(':id/reactions')
  @HttpCode(HttpStatus.OK)
  async toggleReaction(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) postId: string,
    @Body('reactionType') reactionType: string,
  ) {
    return this.reactionsService.togglePostReaction(user.userId, postId, reactionType || 'like');
  }
}
