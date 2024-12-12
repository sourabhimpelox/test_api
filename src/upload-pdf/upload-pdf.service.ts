import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileVersion } from './upload-pdf.entity';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as axios from 'axios';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as multer from 'multer';
import * as convertapi from 'convertapi';
import { Express, Response as ExpressResponse } from 'express';

@Injectable()
export class UploadPdfService {
  private s3 = new AWS.S3();
  private convertApi


  constructor(
    @InjectRepository(FileVersion)
    private readonly fileVersionRepository: Repository<FileVersion>,
  ) {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
    this.convertApi = new convertapi.ConvertAPI('secret_MtzIgjSPdsZxb9bu');
  }

  async handleFileUpload(file: Express.Multer.File) {
    try {
      const versionId = uuidv4();
      const fileName = `${file.originalname.split('.')[0]}_${versionId}.pdf`;
      const s3Params = {
        Bucket: process.env.AWS_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: 'application/pdf',
      };

      const uploadResult = await this.s3.upload(s3Params).promise();

      return this.createFileVersion({
        crn: file.originalname.split('.')[0],
        version: versionId,
        s3Path: uploadResult.Location,
      });
    } catch (error) {
      throw new InternalServerErrorException(`File upload failed: ${error.message}`);
    }
  }

  async getFileVersions(crn: string) {
    try {
      return this.fileVersionRepository.find({
        where: { crn },
        order: { createdAt: 'DESC' },
      });

    } catch (error) {
      throw new InternalServerErrorException(`Failed to fetch file versions: ${error.message}`);
    }
  }

  async streamPdfVersion(version: string, res: ExpressResponse) {
    try {
      const fileVersion = await this.getFileVersionByVersion(version);

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
    } catch (error) {
      throw new InternalServerErrorException(`Failed to stream PDF version: ${error.message}`);
    }
  }

  async handleWordDownload(crn: string, version: string, res: ExpressResponse) {
    try {
      const fileVersion = await this.getFileVersionByCrnAndVersion(crn, version);

      if (!fileVersion) {
        res.status(404).send({ message: 'Version not found' });
        return;
      } else {
        console.log("pdf file present in s3");
      }

      if (fileVersion.s3WordPath) {
        console.log('word file exists in S3 ---------------------------------')
        const wordS3Params = {
          Bucket: process.env.AWS_BUCKET,
          Key: `${fileVersion.crn}_${fileVersion.version}.docx`,
        };

        const wordFileStream = this.s3.getObject(wordS3Params).createReadStream();
        res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        wordFileStream.pipe(res);
        return;
      } else {
        console.log("converting pdf to word");
        const pdfBuffer = await this.downloadPdfFromUrl(fileVersion.s3Path);
        const wordBuffer = await this.convertPdfToWordFromBuffer(pdfBuffer);
        const wordS3Params = {
          Bucket: process.env.AWS_BUCKET,
          Key: `${fileVersion.crn}_${fileVersion.version}.docx`,
          Body: wordBuffer,
        };

        const uploadResult = await this.s3.upload(wordS3Params).promise();
        await this.updateWordPath(fileVersion.id, uploadResult.Location);

        res.setHeader('Content-Disposition', `attachment; filename=${fileVersion.crn}-${fileVersion.version}.docx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(wordBuffer);
      }
    } catch (error) {
      throw new InternalServerErrorException(`Failed to handle Word download: ${error.message}`);
    }
  }

  private async downloadPdfFromUrl(pdfUrl: string): Promise<Buffer> {
    try {
      console.log("pdfurl------------------", pdfUrl);
      const response = await axios.default.get(pdfUrl, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to download PDF: ${error.message}`);
    }
  }

  private async convertPdfToWordFromBuffer(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      // Create a temporary file path
      const tempDir = os.tmpdir();
      const tempFileName = `temp-${Date.now()}.pdf`;
      const tempFilePath = path.join(tempDir, tempFileName);

      // Write the PDF buffer to a temporary file
      await fs.promises.writeFile(tempFilePath, pdfBuffer);

      // Convert PDF to Word document using ConvertAPI
      const result = await this.convertApi.convert('docx', { File: tempFilePath }, 'pdf');

      // Log the Files array to understand its structure
      console.log('Files Array:', result.response.Files);

      // Access the Word file, assuming it's in the Files array
      const file = result.response.Files[0];

      // Check if the file object contains a file URL or base64 data
      if (file && file.Url) {
        const wordFileBuffer = await this.downloadFileBuffer(file.Url);
        return wordFileBuffer;
      } else {
        throw new Error('Failed to retrieve Word file buffer');
      }
    } catch (error) {
      throw new Error(`Failed to convert PDF to Word: ${error.message}`);
    }
  }
  private async downloadFileBuffer(fileUrl: string): Promise<Buffer> {
    const response = await axios.default.get(fileUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  async createFileVersion(data: { crn: string; version: string; s3Path: string }) {
    try {
      const fileVersion = this.fileVersionRepository.create(data);
      return this.fileVersionRepository.save(fileVersion);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create file version: ${error.message}`);
    }
  }

  async getFileVersionByVersion(version: string): Promise<FileVersion | undefined> {
    try {
      return this.fileVersionRepository.findOne({ where: { version } });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to fetch file version: ${error.message}`);
    }
  }

  async getFileVersionByCrnAndVersion(crn: string, version: string): Promise<FileVersion | null> {
    try {
      return this.fileVersionRepository.findOne({ where: { crn, version } });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to fetch file version by CRN and version: ${error.message}`);
    }
  }

  async updateWordPath(id: number, wordPath: string): Promise<void> {
    try {
      await this.fileVersionRepository.update(id, { s3WordPath: wordPath });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update Word path: ${error.message}`);
    }
  }
}
