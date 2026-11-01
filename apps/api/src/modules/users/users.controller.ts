import { Controller, Get, Patch, Body, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getCurrentUser(user.userId);
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getSettings(user.userId);
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(user.userId, dto);
  }

  @Get('search')
  async search(@CurrentUser() user: CurrentUserPayload, @Query('username') username: string) {
    const userResult = await this.usersService.searchExactUsername(user.userId, username);
    return { user: userResult };
  }

  @Get(':id/preview')
  async getPreview(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.usersService.getUserPreview(user.userId, targetUserId);
  }
}
