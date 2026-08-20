import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtVerifierService } from './jwt-verifier.service';

@Module({
  imports: [ConfigModule],
  providers: [JwtVerifierService, JwtAuthGuard],
  exports: [JwtVerifierService, JwtAuthGuard],
})
export class AuthModule {}
