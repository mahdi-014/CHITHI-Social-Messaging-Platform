import { Controller, Get, Patch, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Patch('me')
  async updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(user.userId, dto);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  async removeAvatar(@CurrentUser() user: CurrentUserPayload) {
    return this.profilesService.updateProfile(user.userId, { avatarMediaId: null });
  }

  @Delete('me/cover')
  @HttpCode(HttpStatus.OK)
  async removeCover(@CurrentUser() user: CurrentUserPayload) {
    return this.profilesService.updateProfile(user.userId, { coverMediaId: null });
  }

  @Get(':userId')
  async getProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.profilesService.getProfile(user.userId, targetUserId);
  }
}
