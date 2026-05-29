import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, ResolveDisputeDto } from './dto/create-dispute.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('disputes')
@Controller('disputes')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('evidence', 5))
  @ApiOperation({ summary: 'Ouvrir un litige (délai 48h après livraison)' })
  openDispute(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDisputeDto,
    @UploadedFiles() evidence?: Express.Multer.File[],
  ) {
    return this.disputesService.openDispute(userId, dto, evidence);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes litiges' })
  getMyDisputes(@CurrentUser('id') userId: string) {
    return this.disputesService.findMyDisputes(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un litige' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.disputesService.findOne(id, userId);
  }
}
