import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeOrm.config';
import { ConfigModule } from '@nestjs/config';


import { EventsModule } from './events/events.module';
import { UploadPdfModule } from './upload-pdf/upload-pdf.module';
@Module({
  controllers: [AppController],
  imports: [TypeOrmModule.forRoot(typeOrmConfig), ConfigModule.forRoot(), EventsModule, UploadPdfModule],

  providers: [AppService],
})
export class AppModule {}
