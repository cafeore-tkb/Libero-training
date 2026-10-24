export const BASE_CAMERA_FOV = 36;
export const BASE_CAMERA_DISTANCE = 19.5;

const PORTRAIT_CAMERA_FOV = 52;
const PORTRAIT_CAMERA_DISTANCE = 34;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function cameraLayoutForViewport(width, height) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const aspect = safeWidth / safeHeight;
  const portraitMix = clamp((0.9 - aspect) / 0.44, 0, 1);

  return {
    aspect,
    fov: BASE_CAMERA_FOV + (PORTRAIT_CAMERA_FOV - BASE_CAMERA_FOV) * portraitMix,
    distance: BASE_CAMERA_DISTANCE + (PORTRAIT_CAMERA_DISTANCE - BASE_CAMERA_DISTANCE) * portraitMix
  };
}
