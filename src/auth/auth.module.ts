import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { AiaPlusAuthGuard } from './aia-plus-auth.guard';
import { AiaPlusJwtVerifierService } from './aia-plus-jwt-verifier.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtVerifierService } from './jwt-verifier.service';

@Module({
  imports: [ConfigModule],
  providers: [
    JwtVerifierService,
    JwtAuthGuard,
    AiaPlusJwtVerifierService,
    AiaPlusAuthGuard,
  ],
  exports: [
    JwtVerifierService,
    JwtAuthGuard,
    AiaPlusJwtVerifierService,
    AiaPlusAuthGuard,
  ],
})
export class AuthModule {}
