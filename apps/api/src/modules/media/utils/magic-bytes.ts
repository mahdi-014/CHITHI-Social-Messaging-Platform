/**
 * Validates header magic bytes of media buffers against expected MIME types.
 */
export function validateMediaMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const hex = buffer.subarray(0, 12).toString('hex').toLowerCase();

  switch (declaredMimeType) {
    case 'image/jpeg':
      // JPEG starts with FF D8 FF
      return hex.startsWith('ffd8ff');

    case 'image/png':
      // PNG starts with 89 50 4E 47 0D 0A 1A 0A
      return hex.startsWith('89504e470d0a1a0a');

    case 'image/gif':
      // GIF starts with GIF87a or GIF89a (47 49 46 38)
      return hex.startsWith('47494638');

    case 'image/webp':
      // WEBP starts with RIFF (52 49 46 46) and bytes 8..11 are WEBP (57 45 42 50)
      return hex.startsWith('52494646') && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    case 'video/mp4':
      // MP4 has 'ftyp' at bytes 4..7 (66 74 79 70)
      return buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';

    case 'video/webm':
      // WebM starts with EBML Header (1A 45 DF A3)
      return hex.startsWith('1a45dfa3');

    case 'application/pdf':
      // PDF starts with %PDF (25 50 44 46)
      return hex.startsWith('25504446');

    case 'audio/mpeg':
      // MP3 sync word FF FB or ID3
      return hex.startsWith('494433') || hex.startsWith('fffb') || hex.startsWith('fff3');

    case 'audio/mp4':
      return buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';

    case 'audio/ogg':
      // OggS (4F 67 67 53)
      return hex.startsWith('4f676753');

    default:
      return true;
  }
}
