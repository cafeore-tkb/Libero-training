const EPSILON = 1e-9;

export const POT_QUEUE_POSITIONS = [
  [-4.65, -.45], [-4.65, .75], [-3.45, -.45], [-3.45, .75],
  [-2.25, -.45], [-2.25, .75], [-1.05, -.45], [-1.05, .75]
];

// Each side can hold all eight pots; returned pots never occupy the kettle area.
const RETURN_POT_POSITIONS = [
  [6.2, -1.5], [6.2, -.15], [6.2, 1.2], [6.2, 2.55],
  [7.65, -1.5], [7.65, -.15], [7.65, 1.2], [7.65, 2.55]
];

export function potQueueLayout(queue, pots) {
  let supplyIndex = 0;
  let returnIndex = 0;
  return new Map(queue.map(potIndex => [
    potIndex,
    potQueuePriority(pots[potIndex]) === 2
      ? RETURN_POT_POSITIONS[returnIndex++]
      : POT_QUEUE_POSITIONS[supplyIndex++]
  ]));
}

export function potQueuePriority(pot) {
  if (pot.assignedDripper == null && pot.water <= EPSILON) return 0;
  if (pot.assignedDripper != null) return 1;
  return 2;
}

export function arrangePotQueue(queue, pots) {
  const arranged = queue
    .map((potIndex, order) => ({ potIndex, order, priority: potQueuePriority(pots[potIndex]) }))
    .sort((a, b) => a.priority - b.priority || a.order - b.order)
    .map(item => item.potIndex);
  queue.splice(0, queue.length, ...arranged);
  return queue;
}
