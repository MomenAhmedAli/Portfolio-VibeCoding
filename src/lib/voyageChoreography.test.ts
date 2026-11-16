import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeVoyageFrameState,
  computeVoyageSectionProgress,
  isCompassActiveInSection,
} from './voyageChoreography';

test('isCompassActiveInSection is false outside section and true when dominant in viewport', () => {
  const vh = 900;
  assert.equal(isCompassActiveInSection(1200, 5200, vh), false);
  assert.equal(isCompassActiveInSection(700, 5200, vh), false);
  assert.equal(isCompassActiveInSection(-4800, -100, vh), false);
  assert.equal(isCompassActiveInSection(300, 4800, vh), true);
});

test('computeVoyageSectionProgress clamps smoothly between 0 and 1', () => {
  assert.equal(computeVoyageSectionProgress(400, 4680, 900), 0);
  assert.equal(computeVoyageSectionProgress(-5000, 4680, 900), 1);
  const mid = computeVoyageSectionProgress(-1890, 4680, 900);
  assert.ok(Math.abs(mid - 0.5) < 0.01);
});

test('single sphere rotates unified, splits into fragments, reassembles at once with center copy, and vanishes cleanly', () => {
  // Stage 1: Single intact sphere rotating cleanly
  const intact = computeVoyageFrameState(0.15);
  assert.equal(intact.stageIndex, 1);
  assert.equal(intact.splitAmount, 0);
  assert.equal(intact.centerTextAlpha, 0);
  assert.equal(intact.circleAlpha, 1);

  // Stage 2: Splits apart while rotating
  const split = computeVoyageFrameState(0.45);
  assert.equal(split.stageIndex, 2);
  assert.equal(split.splitAmount, 1);
  assert.equal(split.centerTextAlpha, 0);
  assert.ok(split.rotationRad > intact.rotationRad);

  // Stage 3: All chunks snap back together simultaneously while centered copy appears
  const reassembled = computeVoyageFrameState(0.68);
  assert.equal(reassembled.stageIndex, 3);
  assert.equal(reassembled.splitAmount, 0);
  assert.ok(reassembled.reassembleSurge > 0.8);
  assert.equal(reassembled.centerTextAlpha, 1);

  // Stage 4: Dissolves completely before section exit
  const preExit = computeVoyageFrameState(0.92);
  assert.equal(preExit.stageIndex, 4);
  assert.equal(preExit.vanishProgress, 1);
  assert.equal(preExit.circleAlpha, 0);
  assert.equal(preExit.centerTextAlpha, 0);
});
