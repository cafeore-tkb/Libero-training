const EPSILON = 1e-9;

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
