export const term = (id: string, pattern: string, enabled = true) => ({
  id,
  name: id,
  pattern,
  enabled,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});

export const ipTerm = term('ip', '(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)');
export const ticketTerm = term('ticket', '(?<ticket>[A-Z]{2,}-\\d+)');
export const userTerm = term('user', '(?<user>@\\w+)', false);
