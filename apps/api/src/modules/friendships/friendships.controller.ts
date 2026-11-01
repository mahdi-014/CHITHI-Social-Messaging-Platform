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
import { FriendshipsService } from './friendships.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller()
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Post('friend-requests')
  @HttpCode(HttpStatus.CREATED)
  async sendRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendshipsService.sendFriendRequest(user.userId, dto);
  }

  @Get('friend-requests/incoming')
  async getIncoming(@CurrentUser() user: CurrentUserPayload) {
    return this.friendshipsService.getIncomingRequests(user.userId);
  }

  @Get('friend-requests/outgoing')
  async getOutgoing(@CurrentUser() user: CurrentUserPayload) {
    return this.friendshipsService.getOutgoingRequests(user.userId);
  }

  @Post('friend-requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    return this.friendshipsService.acceptFriendRequest(user.userId, requestId);
  }

  @Post('friend-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    return this.friendshipsService.rejectFriendRequest(user.userId, requestId);
  }

  @Delete('friend-requests/:id')
  async cancelRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) requestId: string,
  ) {
    return this.friendshipsService.cancelOutgoingRequest(user.userId, requestId);
  }

  @Get('friends')
  async getFriends(@CurrentUser() user: CurrentUserPayload) {
    return this.friendshipsService.getFriendsList(user.userId);
  }

  @Delete('friends/:targetUserId')
  async unfriend(
    @CurrentUser() user: CurrentUserPayload,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.friendshipsService.unfriend(user.userId, targetUserId);
  }

  @Post('users/:targetUserId/block')
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @CurrentUser() user: CurrentUserPayload,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.friendshipsService.blockUser(user.userId, targetUserId);
  }

  @Delete('users/:targetUserId/block')
  async unblockUser(
    @CurrentUser() user: CurrentUserPayload,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.friendshipsService.unblockUser(user.userId, targetUserId);
  }

  @Get('users/blocks/list')
  async getBlocks(@CurrentUser() user: CurrentUserPayload) {
    return this.friendshipsService.getBlockedUsers(user.userId);
  }
}
