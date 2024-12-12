// import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import * as AWS from 'aws-sdk';
// import { v4 as uuidv4 } from 'uuid';
// import * as multer from 'multer';
// import { Express, Response as ExpressResponse} from 'express';
// import { FileVersion } from './upload-pdf.entity';
// import { UploadPdfService } from './upload-pdf.service';

// @Controller('upload-pdf')
// export class UploadPdfController {
//   private s3 = new AWS.S3();

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
//         s3Path: uploadResult.Location,
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
//     let data =await this.fileVersionService.getFileVersions(crn);
//     console.log("data-----------",data);
//     return data
//   }

//   @Get('download/:version')
//   async downloadVersion(@Param('version') version: string, @Res() res: ExpressResponse) {
//     const fileVersion = await this.fileVersionService.getFileVersionByVersion(version);

//     if (!fileVersion) {
//       res.status(404).send({ message: 'Version not found' });
//       return;
//     }

//     const s3Params = {
//       Bucket: process.env.AWS_BUCKET,
//       Key: `${fileVersion.crn}_${fileVersion.version}.pdf`,
//     };

//     const fileStream = this.s3.getObject(s3Params).createReadStream();

//     res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.pdf`);
//     res.setHeader('Content-Type', 'application/pdf');

//     fileStream.pipe(res);
//   }

// }
import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as multer from 'multer';
import { Express, Response as ExpressResponse } from 'express';
import { UploadPdfService } from './upload-pdf.service';
import { FileVersion } from './upload-pdf.entity';
import { convertPdfToWord } from './convert-api.helper';

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
      const fileName = `${file.originalname.split('.')[0]}_${versionId}.pdf`;

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
      throw new BadRequestException('Failed to upload file');
    }
  }

  @Get('versions/:crn')
  async getFileVersions(@Param('crn') crn: string) {
    const versions = await this.fileVersionService.getFileVersions(crn);
    if (!versions.length) {
      throw new BadRequestException(`No versions found for CRN: ${crn}`);
    }
    return { data: versions };
  }

  @Get('download/:version')
  async downloadVersion(
    @Param('version') version: string,
    @Res() res: ExpressResponse,
  ) {
    const fileVersion =
      await this.fileVersionService.getFileVersionByVersion(version);

    if (!fileVersion) {
      res.status(404).send({ message: 'Version not found' });
      return;
    }

    const s3Params = {
      Bucket: process.env.AWS_BUCKET,
      Key: `${fileVersion.crn}_${fileVersion.version}.pdf`,
    };

    try {
      const fileStream = this.s3.getObject(s3Params).createReadStream();
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${fileVersion.crn}-${fileVersion.version}.pdf`,
      );
      res.setHeader('Content-Type', 'application/pdf');
      fileStream.pipe(res);
    } catch (error) {
      throw new BadRequestException('Error downloading the file');
    }
  }

  // @Get('download-word/:crn/:version')
  // async downloadWordVersion(
  //   @Param('crn') crn: string,
  //   @Param('version') version: string,
  //   @Res() res: ExpressResponse,
  // ) {
  //   const fileVersion = await this.fileVersionService.getFileVersionByVersion(version);

  //   if (!fileVersion) {
  //     res.status(404).send({ message: 'Version not found' });
  //     return;
  //   }

  //   if (fileVersion.s3WordPath) {

  //     const wordS3Params = {
  //       Bucket: process.env.AWS_BUCKET,
  //       Key: `${fileVersion.crn}_${fileVersion.version}.docx`,
  //     };

  //     try {
  //       const wordFileStream = this.s3.getObject(wordS3Params).createReadStream();
  //       res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`);
  //       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  //       wordFileStream.pipe(res);
  //     } catch (error) {
  //       throw new BadRequestException('Error downloading Word file from S3');
  //     }
  //   } else {
  //     // Convert PDF to Word and save to S3
  //     const pdfFileBuffer = await this.s3
  //       .getObject({
  //         Bucket: process.env.AWS_BUCKET,
  //         Key: `${fileVersion.crn}_${fileVersion.version}.pdf`,
  //       })
  //       .promise();

  //     const wordBuffer = await convertPdfToWord(pdfFileBuffer.Body as Buffer);

  //     const wordFileName = `${fileVersion.crn}_${fileVersion.version}.docx`;
  //     const wordS3Params = {
  //       Bucket: process.env.AWS_BUCKET,
  //       Key: wordFileName,
  //       Body: wordBuffer,
  //       ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  //     };

  //     // Upload converted Word file to S3
  //     const uploadResult = await this.s3.upload(wordS3Params).promise();

  //     // Update the database with the Word file URL
  //     await this.fileVersionService.updateWordPath(fileVersion.id, uploadResult.Location);

  //     // Stream the Word file to the client
  //     res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`);
  //     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  //     res.send(wordBuffer);
  //   }
  // }

  @Get('download-word/:crn/:version')
  async downloadWordVersion(
    @Param('crn') crn: string,
    @Param('version') version: string,
    @Res() res: ExpressResponse,
  ) {
    const fileVersion =
      await this.fileVersionService.getFileVersionByVersion(version);

    if (!fileVersion) {
      res.status(404).send({ message: 'Version not found' });
      return;
    }

    if (fileVersion.s3WordPath) {
      // Word file already exists in S3
      console.log('File exists in S3 ---------------------------------');
      const wordS3Params = {
        Bucket: process.env.AWS_BUCKET,
        Key: `${fileVersion.crn}_${fileVersion.version}.docx`,
      };

      try {
        const wordFileStream = this.s3
          .getObject(wordS3Params)
          .createReadStream();
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`,
        );
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        wordFileStream.pipe(res).on('error', (err) => {
          console.error('Error streaming Word file:', err);
          res.status(500).send({ message: 'Error streaming Word file' });
        });
      } catch (error) {
        console.error('Error downloading Word file from S3:', error);
        res
          .status(500)
          .send({ message: 'Error downloading Word file from S3' });
      }
    } else {
      console.log('word not present in s3');
      try {
        const pdfFileBuffer = await this.s3
          .getObject({
            Bucket: process.env.AWS_BUCKET,
            Key: `${fileVersion.crn}_${fileVersion.version}.pdf`,
          })
          .promise();

          console.log(pdfFileBuffer);

        const wordBuffer = await convertPdfToWord(`${fileVersion.crn}_${fileVersion.version}.pdf`);

        const wordFileName = `${fileVersion.crn}_${fileVersion.version}.docx`;
        const wordS3Params = {
          Bucket: process.env.AWS_BUCKET,
          Key: wordFileName,
          Body: wordBuffer,
          ContentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };

        // Upload converted Word file to S3
        const uploadResult = await this.s3.upload(wordS3Params).promise();

        // Update the database with the Word file URL
        await this.fileVersionService.updateWordPath(
          fileVersion.id,
          uploadResult.Location,
        );

        // Stream the Word file to the client
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`,
        );
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        res.send(wordBuffer);
      } catch (error) {
        console.error('Error processing PDF to Word:', error);
        res.status(500).send({ message: 'Error converting PDF to Word' });
      }
    }
  }
}
