import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileVersion } from './upload-pdf.entity';

@Injectable()
export class UploadPdfService {
  constructor(
    @InjectRepository(FileVersion)
    private fileVersionRepository: Repository<FileVersion>,
  ) {

  }

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

}
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { FileVersion } from './upload-pdf.entity';

// @Injectable()
// export class UploadPdfService {
//   constructor(
//     @InjectRepository(FileVersion)
//     private fileVersionRepository: Repository<FileVersion>,
//   ) {}

//   // Create file version entry in the database
//   async createFileVersion(data: { crn: string; version: string; s3Path: string }) {
//     const fileVersion = this.fileVersionRepository.create(data);
//     return this.fileVersionRepository.save(fileVersion);
//   }

//   // Get all file versions for a specific CRN
//   async getFileVersions(crn: string) {
//     return this.fileVersionRepository.find({
//       where: { crn },
//       order: { createdAt: 'DESC' },
//     });
//   }

//   // Get file version by CRN and version
//   async getFileVersionByCrnAndVersion(crn: string, version: string): Promise<FileVersion | undefined> {
//     return this.fileVersionRepository.findOne({
//       where: { crn, version },
//     });
//   }

//   // Get file version by version ID
//   async getFileVersionByVersion(version: string): Promise<FileVersion | undefined> {
//     return this.fileVersionRepository.findOne({ where: { version } });
//   }

//   // Save updated file version after converting PDF to Word
//   async saveFileVersion(fileVersion: FileVersion) {
//     return this.fileVersionRepository.save(fileVersion);
//   }
// }