export function replaceById<T extends { id: string }>(
  items: T[],
  id: string,
  notFoundMessage: string,
  update: (item: T) => T
): T {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error(notFoundMessage);
  const updated = update(items[index]);
  items[index] = updated;
  return updated;
}

export function removeById<T extends { id: string }>(
  items: T[],
  id: string,
  notFoundMessage: string
): void {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new Error(notFoundMessage);
  items.splice(index, 1);
}
