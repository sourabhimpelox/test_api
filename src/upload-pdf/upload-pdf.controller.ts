
// import {
//   Controller,
//   Get,
//   Param,
//   Post,
//   Res,
//   UploadedFile,
//   UseInterceptors,
//   BadRequestException,
// } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import * as AWS from 'aws-sdk';
// import { v4 as uuidv4 } from 'uuid';
// import * as multer from 'multer';
// import { Express, Response as ExpressResponse } from 'express';
// import { UploadPdfService } from './upload-pdf.service';
// import { FileVersion } from './upload-pdf.entity';
// import { convertPdfToWord } from './convert-api.helper';
// import * as convertapi from 'convertapi';
// import * as path from 'path';
// import * as fs from 'fs';
// import * as os from 'os';


// import axios from 'axios'


// @Controller('upload-pdf')
// export class UploadPdfController {
//   private s3 = new AWS.S3();
//   api: any

//   constructor(private readonly fileVersionService: UploadPdfService) {
//     AWS.config.update({
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//       region: process.env.AWS_REGION,
//     });
//     this.api = new convertapi.ConvertAPI('secret_MtzIgjSPdsZxb9bu');
//   }


//   @Post()
//   @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
//   async uploadFile(@UploadedFile() file: Express.Multer.File) {
//     try {
//       const versionId = uuidv4();
//       const fileName = `${file.originalname.split('.')[0]}_${versionId}.pdf`;

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
//       throw new BadRequestException('Failed to upload file');
//     }
//   }

//   @Get('versions/:crn')
//   async getFileVersions(@Param('crn') crn: string) {
//     const versions = await this.fileVersionService.getFileVersions(crn);
//     if (!versions.length) {
//       throw new BadRequestException(`No versions found for CRN: ${crn}`);
//     }
//     return { data: versions };
//   }

//   @Get('download/:version')
//   async downloadVersion(
//     @Param('version') version: string,
//     @Res() res: ExpressResponse,
//   ) {
//     const fileVersion =
//       await this.fileVersionService.getFileVersionByVersion(version);

//     if (!fileVersion) {
//       res.status(404).send({ message: 'Version not found' });
//       return;
//     }

//     const s3Params = {
//       Bucket: process.env.AWS_BUCKET,
//       Key: `${fileVersion.crn}_${fileVersion.version}.pdf`,
//     };

//     try {
//       const fileStream = this.s3.getObject(s3Params).createReadStream();
//       res.setHeader(
//         'Content-Disposition',
//         `attachment; filename=${fileVersion.crn}-${fileVersion.version}.pdf`,
//       );
//       res.setHeader('Content-Type', 'application/pdf');
//       fileStream.pipe(res);
//     } catch (error) {
//       throw new BadRequestException('Error downloading the file');
//     }
//   }



//   @Get('download-word/:crn/:version')
//   async downloadWordVersion(
//     @Param('crn') crn: string,
//     @Param('version') version: string,
//     @Res() res: ExpressResponse,
//   ) {
//     const fileVersion = await this.fileVersionService.getFileVersionByCrnAndVersion(crn, version);


//     if (!fileVersion) {
//       res.status(404).send({ message: 'Version not found' });
//       return;
//     } else {
//       console.log("pdf file present in s3");
//     }

//     if (fileVersion.s3WordPath) {
//       // Word file already exists in S3
//       console.log('word file exists in S3 ---------------------------------');
//       const wordS3Params = {
//         Bucket: process.env.AWS_BUCKET,
//         Key: `${fileVersion.crn}_${fileVersion.version}.docx`,
//       };

//       try {
//         const wordFileStream = this.s3.getObject(wordS3Params).createReadStream();
//         res.setHeader(
//           'Content-Disposition',
//           `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`,
//         );
//         res.setHeader(
//           'Content-Type',
//           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//         );
//         wordFileStream.pipe(res).on('error', (err) => {
//           console.error('Error streaming Word file:', err);
//           res.status(500).send({ message: 'Error streaming Word file' });
//         });
//       } catch (error) {
//         console.error('Error downloading Word file from S3:', error);
//         res.status(500).send({ message: 'Error downloading Word file from S3' });
//       }
//     } else {
//       // Word file does not exist, fetch PDF URL and process
//       console.log('Word file not present in S3');
//       if (!fileVersion.s3Path) {
//         res.status(404).send({ message: 'PDF URL not found in the database' });
//         return;
//       }

//       try {

//         const pdfBuffer = await this.downloadPdfFromUrl(fileVersion.s3Path);
//         console.log("pdf buffer------------------------", pdfBuffer);
//         const wordBuffer = await this.convertPdfToWordFromBuffer(pdfBuffer);
//         console.log("pdf buffer------------------------", wordBuffer);
//         const wordS3Params = { Bucket: process.env.AWS_BUCKET, Key: `${fileVersion.crn}_${fileVersion.version}.docx`, Body: wordBuffer };
//         const uploadResult = await this.s3.upload(wordS3Params).promise();

//         await this.fileVersionService.updateWordPath(fileVersion.id, uploadResult.Location);
//         res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`);
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
//         res.send(wordBuffer);
//       } catch (error) {
//         console.error('Error processing PDF to Word:', error);
//         res.status(500).send({ message: 'Error converting PDF to Word' });
//       }
//     }
//   }

//   // Helper function to download PDF from URL
//   private async downloadPdfFromUrl(pdfUrl: string): Promise<Buffer> {
//     try {
//       console.log("pdfurl------------------", pdfUrl);
//       const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
//       return Buffer.from(response.data);
//     } catch (error) {
//       throw new Error('Failed to download PDF from URL: ' + error.message);
//     }
//   }


//   private async convertPdfToWordFromBuffer(pdfBuffer: Buffer): Promise<Buffer> {
//     try {
//       // Create a temporary file path
//       const tempDir = os.tmpdir();
//       const tempFileName = `temp-${Date.now()}.pdf`;
//       const tempFilePath = path.join(tempDir, tempFileName);

//       // Write the PDF buffer to a temporary file
//       await fs.promises.writeFile(tempFilePath, pdfBuffer);

//       // Convert PDF to Word document using ConvertAPI
//       const result = await this.api.convert('docx', { File: tempFilePath }, 'pdf');

//       // Log the Files array to understand its structure
//       console.log('Files Array:', result.response.Files);

//       // Access the Word file, assuming it's in the Files array
//       const file = result.response.Files[0];

//       // Check if the file object contains a file URL or base64 data
//       if (file && file.Url) {
//         const wordFileBuffer = await this.downloadFileBuffer(file.Url);
//         return wordFileBuffer;
//       } else {
//         throw new Error('Failed to retrieve Word file buffer');
//       }
//     } catch (error) {
//       throw new Error(`Failed to convert PDF to Word: ${error.message}`);
//     }
//   }

//   // Helper method to download a file buffer from a URL (for example, from the ConvertAPI URL)
//   private async downloadFileBuffer(fileUrl: string): Promise<Buffer> {
//     const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
//     return Buffer.from(response.data);
//   }

// }

// Controller File
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