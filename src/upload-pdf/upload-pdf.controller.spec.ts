import { Test, TestingModule } from '@nestjs/testing';
import { UploadPdfController } from './upload-pdf.controller';

describe('UploadPdfController', () => {
  let controller: UploadPdfController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadPdfController],
    }).compile();

    controller = module.get<UploadPdfController>(UploadPdfController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
