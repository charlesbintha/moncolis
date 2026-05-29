import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SuspendDto {
  @ApiProperty({ description: 'Raison de la suspension', minLength: 3 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  reason: string;
}
