import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Laisser une évaluation après livraison (délai 72h)' })
  create(@CurrentUser('id') reviewerId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(reviewerId, dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtenir les évaluations d\'un utilisateur' })
  getUserReviews(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.reviewsService.getUserReviews(userId, page, limit);
  }
}
