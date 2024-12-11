import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as multer from 'multer';
import { Express, Response as ExpressResponse} from 'express';
import { FileVersion } from './upload-pdf.entity'; 
import { UploadPdfService } from './upload-pdf.service';
import { retry } from 'rxjs';

@Controller('upload-pdf')
export class UploadPdfController {
  private s3 = new AWS.S3();

  constructor(private readonly fileVersionService: UploadPdfService) {
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
      const versionId = uuidv4();
      const fileName = `${file.originalname.split('.')[0]}_${versionId}.pdf`; // Append version ID to file name

      const s3Params = {
        Bucket: process.env.AWS_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: 'application/pdf',
      };

      // Upload to S3
      const uploadResult = await this.s3.upload(s3Params).promise();

      // Save metadata to database
      const savedVersion = await this.fileVersionService.createFileVersion({
        crn: file.originalname.split('.')[0],
        version: versionId,
        s3Path: uploadResult.Location,
      });

      return {
        message: 'File uploaded successfully',
        version: savedVersion,
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  @Get('versions/:crn')
  async getFileVersions(@Param('crn') crn: string) {
    let data =await this.fileVersionService.getFileVersions(crn);
    console.log("data-----------",data);
    return data
  }

  @Get('download/:version')
  async downloadVersion(@Param('version') version: string, @Res() res: ExpressResponse) {
    const fileVersion = await this.fileVersionService.getFileVersionByVersion(version);

    if (!fileVersion) {
      res.status(404).send({ message: 'Version not found' });
      return;
    }

    const s3Params = {
      Bucket: process.env.AWS_BUCKET,
      Key: `${fileVersion.crn}_${fileVersion.version}.pdf`,
    };

    const fileStream = this.s3.getObject(s3Params).createReadStream();

    res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    fileStream.pipe(res);
  }
}
// import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import * as AWS from 'aws-sdk';
// import { v4 as uuidv4 } from 'uuid';
// import * as multer from 'multer';
// import { Express, Response as ExpressResponse } from 'express';
// import ConvertAPI from 'convertapi';
// import { UploadPdfService } from './upload-pdf.service';


// @Controller('upload-pdf')
// export class UploadPdfController {
//   private s3 = new AWS.S3();
//   private convertapi = new ConvertAPI('your-api-secret-or-token', { conversionTimeout: 60 });

//   constructor(private readonly fileVersionService: UploadPdfService) {
//     AWS.config.update({
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//       region: process.env.AWS_REGION,
//     });
//   }

//   @Post()
//   @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
//   async uploadFile(@UploadedFile() file: Express.Multer.File) {
//     try {
//       const versionId = uuidv4();
//       const fileName = `${file.originalname.split('.')[0]}_${versionId}.pdf`; // Append version ID to file name

//       const s3Params = {
//         Bucket: process.env.AWS_BUCKET,
//         Key: fileName,
//         Body: file.buffer,
//         ContentType: 'application/pdf',
//       };

//       // Upload to S3
//       const uploadResult = await this.s3.upload(s3Params).promise();

//       // Save metadata to database
//       const savedVersion = await this.fileVersionService.createFileVersion({
//         crn: file.originalname.split('.')[0],
//         version: versionId,
//         pdfUrl: uploadResult.Location,
//       });

//       return {
//         message: 'File uploaded successfully',
//         version: savedVersion,
//       };
//     } catch (error) {
//       console.error('Error uploading file to S3:', error);
//       throw error;
//     }
//   }

//   @Get('versions/:crn')
//   async getFileVersions(@Param('crn') crn: string) {
//     let data = await this.fileVersionService.getFileVersions(crn);
//     return data;
//   }

//   @Get('download/:version')
//   async downloadVersion(@Param('version') version: string, @Res() res: ExpressResponse) {
//     const fileVersion = await this.fileVersionService.getFileVersionByVersion(version);

//     if (!fileVersion) {
//       res.status(404).send({ message: 'Version not found' });
//       return;
//     }

//     // Check if Word URL exists
//     if (fileVersion.wordUrl) {
//       // If Word URL exists, download the Word file from S3
//       const s3Params = {
//         Bucket: process.env.AWS_BUCKET,
//         Key: fileVersion.wordUrl.split('/').pop(), // Extract file name from URL
//       };

//       const fileStream = this.s3.getObject(s3Params).createReadStream();

//       res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`);
//       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
//       fileStream.pipe(res);
//     } else {
//       // If Word file doesn't exist, convert the PDF to Word and then download
//       const wordUrl = await this.convertPdfToWord(fileVersion.pdfUrl);

//       // Upload Word file to S3
//       const wordFileName = `${fileVersion.crn}-${fileVersion.version}.docx`;
//       const wordS3Params = {
//         Bucket: process.env.AWS_BUCKET,
//         Key: wordFileName,
//         Body: wordUrl,  // Use the content from the conversion API
//         ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       };

//       // Upload Word file to S3
//       const uploadWordResult = await this.s3.upload(wordS3Params).promise();

//       // Update the database with the new wordUrl
//       await this.fileVersionService.updateWordUrl(fileVersion.id, uploadWordResult.Location);

//       // Download the Word file from S3
//       const s3Params = {
//         Bucket: process.env.AWS_BUCKET,
//         Key: uploadWordResult.Key, // Use the uploaded word file name
//       };

//       const fileStream = this.s3.getObject(s3Params).createReadStream();

//       res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`);
//       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
//       fileStream.pipe(res);
//     }
//   }

//   // Convert PDF to Word using ConvertAPI
//   async convertPdfToWord(pdfUrl: string): Promise<string> {
//     try {
//       const result = await this.convertapi.convert('docx', { File: pdfUrl });
//       const wordUrl = result.file.url;
//       return wordUrl;
//     } catch (error) {
//       console.error('Error converting PDF to Word:', error);
//       throw new Error('Conversion failed');
//     }
//   }
// }
