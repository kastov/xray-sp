import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { BrandService } from '../brand/brand.service';

@Module({
  controllers: [AdminController],
  providers: [AuthService, AuthGuard, BrandService],
  exports: [AuthService, BrandService],
})
export class AdminModule {}
