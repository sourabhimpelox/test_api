import { Test, TestingModule } from '@nestjs/testing';
import { UploadPdfService } from './upload-pdf.service';

describe('UploadPdfService', () => {
  let service: UploadPdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadPdfService],
    }).compile();

    service = module.get<UploadPdfService>(UploadPdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
