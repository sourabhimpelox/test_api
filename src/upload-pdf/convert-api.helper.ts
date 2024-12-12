
import ConvertAPI from 'convertapi';

export async function convertPdfToWord(pdfBuffer: string): Promise<any> {
    // console.log("buffer-----------------------", pdfBuffer, pdfBuffer.length);
  try {
    const convertApi = new ConvertAPI(process.env.CONVERTAPI_KEY);
    const result = await convertApi.convert('pdf', { File: pdfBuffer });
    const file = await result.file[0].download(); // Download as buffer
    return file;
  } catch (error) {
    console.error('Error converting PDF to Word:', error);
    throw new Error('Error converting PDF to Word');
  }
}

