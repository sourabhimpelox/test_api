import { Module } from '@nestjs/common';
import { UploadPdfService } from './upload-pdf.service';
import { UploadPdfController } from './upload-pdf.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileVersion } from './upload-pdf.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileVersion])],
  providers: [UploadPdfService],
  controllers: [UploadPdfController]
})
export class UploadPdfModule {}
