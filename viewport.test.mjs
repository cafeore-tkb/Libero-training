import test from "node:test";
import assert from "node:assert/strict";
import { BASE_CAMERA_DISTANCE, BASE_CAMERA_FOV, cameraLayoutForViewport } from "./viewport.js";

test("wide screens keep the original camera framing", () => {
  const layout = cameraLayoutForViewport(1440, 900);
  assert.equal(layout.aspect, 1.6);
  assert.equal(layout.fov, BASE_CAMERA_FOV);
  assert.equal(layout.distance, BASE_CAMERA_DISTANCE);
});

test("portrait phones widen the camera framing", () => {
  const layout = cameraLayoutForViewport(390, 844);
  assert.ok(layout.fov > BASE_CAMERA_FOV);
  assert.ok(layout.distance > BASE_CAMERA_DISTANCE);
  assert.ok(layout.fov <= 52);
  assert.ok(layout.distance <= 34);
});

test("invalid dimensions still produce a finite layout", () => {
  const layout = cameraLayoutForViewport(0, 0);
  assert.ok(Number.isFinite(layout.aspect));
  assert.ok(Number.isFinite(layout.fov));
  assert.ok(Number.isFinite(layout.distance));
});
