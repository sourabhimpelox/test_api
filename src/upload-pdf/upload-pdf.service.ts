
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileVersion } from './upload-pdf.entity';

@Injectable()
export class UploadPdfService {
  constructor(
    @InjectRepository(FileVersion)
    private readonly fileVersionRepository: Repository<FileVersion>,
  ) {}

  async createFileVersion(data: { crn: string; version: string; s3Path: string }) {
    const fileVersion = this.fileVersionRepository.create(data);
    return this.fileVersionRepository.save(fileVersion);
  }

  async getFileVersions(crn: string) {
    return this.fileVersionRepository.find({
      where: { crn },
      order: { createdAt: 'DESC' },
    });
  }

  async getFileVersionByVersion(version: string): Promise<FileVersion | undefined> {
    return this.fileVersionRepository.findOne({ where: { version } });
  }

  async updateWordPath(id: number, wordPath: string): Promise<void> {
    await this.fileVersionRepository.update(id, { s3WordPath: wordPath })
  }
}
