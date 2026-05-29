import { Controller, Post, Get, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Initier un paiement (escrow) pour une réservation acceptée' })
  initiatePayment(@CurrentUser('id') senderId: string, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(senderId, dto);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Historique des transactions' })
  getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.paymentsService.getTransactionHistory(userId, page, limit);
  }

  @Post('webhook/paydunya')
  @ApiOperation({ summary: 'Webhook PayDunya (IPN)' })
  handlePayDunyaWebhook(@Body() payload: any) {
    return this.paymentsService.handlePayDunyaWebhook(payload);
  }
}
