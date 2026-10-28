import { describe, it, expect } from 'vitest';
import { CAMERA_DISCLOSURE_TEXT } from '../../src/components/CameraDisclosureModal';

describe('Camera Prominent Disclosure Content', () => {
  it('contains mandatory Google Play disclosure elements', () => {
    expect(CAMERA_DISCLOSURE_TEXT.title).toBeDefined();
    expect(CAMERA_DISCLOSURE_TEXT.description.toLowerCase()).toContain('aparat');
    expect(CAMERA_DISCLOSURE_TEXT.description.toLowerCase()).toContain('lokalnie');
    expect(CAMERA_DISCLOSURE_TEXT.zeroDataNotice.toLowerCase()).toContain('chmur');
  });
});
