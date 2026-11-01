import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { CreateCallDto } from './dto/create-call.dto';
import { CallActionDto } from './dto/call-action.dto';
import { CallQueryDto } from './dto/call-query.dto';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get('turn-credentials')
  getTurnCredentials(@CurrentUser() user: CurrentUserPayload) {
    const iceServers = this.callsService.getIceServers(user.userId);
    return {
      iceServers,
    };
  }

  @Post('invite')
  async initiateCall(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCallDto,
  ) {
    return this.callsService.initiateCall(user.userId, dto);
  }

  @Post(':id/accept')
  async acceptCall(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.callsService.acceptCall(id, user.userId);
  }

  @Post(':id/reject')
  async rejectCall(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CallActionDto,
  ) {
    return this.callsService.rejectCall(id, user.userId, dto?.reason);
  }

  @Post(':id/cancel')
  async cancelCall(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.callsService.cancelCall(id, user.userId);
  }

  @Post(':id/end')
  async endCall(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CallActionDto,
  ) {
    return this.callsService.endCall(id, user.userId, dto?.reason);
  }

  @Get('history')
  async getCallHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CallQueryDto,
  ) {
    return this.callsService.getCallHistory(user.userId, query.limit, query.cursor);
  }

  @Get(':id')
  async getCallById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.callsService.getCallById(user.userId, id);
  }
}
