
import { Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as multer from 'multer';
import { Express } from 'express';

@Controller('upload-pdf')
export class UploadPdfController {
  private s3 = new AWS.S3();

  constructor() {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      const fileName = `${file.originalname.split('.')[0]}.pdf`; // Use a consistent file name for versioning
      const s3Params = {
        Bucket: process.env.AWS_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: 'application/pdf',
      };

      const uploadResult = await this.s3.upload(s3Params).promise();
      return { message: 'File uploaded successfully', fileUrl: uploadResult.Location };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }


}
