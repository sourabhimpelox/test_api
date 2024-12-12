import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, Response as ExpressResponse } from 'express';
import { UploadPdfService } from './upload-pdf.service';

@Controller('upload-pdf')
export class UploadPdfController {
  constructor(private readonly uploadPdfService: UploadPdfService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      return await this.uploadPdfService.handleFileUpload(file);
    } catch (error) {
      throw new BadRequestException('Failed to upload file');
    }
  }

  @Get('versions/:crn')
  async getFileVersions(@Param('crn') crn: string) {
    const versions = await this.uploadPdfService.getFileVersions(crn);
    if (!versions.length) {
      throw new BadRequestException(`No versions found for CRN: ${crn}`);
    }
    return { data: versions };
  }

  @Get('download/:version')
  async downloadVersion(@Param('version') version: string, @Res() res: ExpressResponse) {
    try {
      await this.uploadPdfService.streamPdfVersion(version, res);
    } catch (error) {
      throw new BadRequestException('Error downloading the file');
    }
  }

  @Get('download-word/:crn/:version')
  async downloadWordVersion(@Param('crn') crn: string, @Param('version') version: string, @Res() res: ExpressResponse) {
    try {
      await this.uploadPdfService.handleWordDownload(crn, version, res);
    } catch (error) {
      throw new BadRequestException('Error converting PDF to Word');
    }
  }
}