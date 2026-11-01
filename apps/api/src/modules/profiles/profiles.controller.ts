import { Controller, Get, Patch, Body, Param, ParseUUIDPipe } from '@nestjs/common';
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

  @Get(':userId')
  async getProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.profilesService.getProfile(user.userId, targetUserId);
  }
}
