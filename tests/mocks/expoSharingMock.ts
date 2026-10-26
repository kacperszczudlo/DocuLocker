export async function isAvailableAsync() {
  return true;
}

export async function shareAsync(url: string, options?: { mimeType?: string; dialogTitle?: string; UTI?: string }) {
  return;
}

export default {
  isAvailableAsync,
  shareAsync,
};
