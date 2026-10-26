export async function printToFileAsync(options: { html: string; width?: number; height?: number; base64?: boolean }) {
  return {
    uri: 'file:///mock/print/output.pdf',
    numberOfPages: 1,
    base64: options.base64 ? 'MOCK_BASE64_PDF_DATA' : undefined,
  };
}

export default {
  printToFileAsync,
};
