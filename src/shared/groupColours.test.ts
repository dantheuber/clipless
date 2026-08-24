import { describe, it, expect } from 'vitest';
import {
  GROUP_COLOUR_SLOTS,
  GROUP_COLOUR_SLOT_COUNT,
  DEFAULT_GROUP_SLOTS,
  assignGroupSlots,
  resolveGroupSlot,
  isSlotIndex,
} from './groupColours';

describe('GROUP_COLOUR_SLOTS', () => {
  it('has twelve slots, each with a dark and a light hex', () => {
    expect(GROUP_COLOUR_SLOT_COUNT).toBe(12);
    for (const slot of GROUP_COLOUR_SLOTS) {
      expect(slot.dark).toMatch(/^#[0-9a-f]{6}$/);
      expect(slot.light).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('carries the light fixes from the contrast pass', () => {
    expect(GROUP_COLOUR_SLOTS[7].light).toBe('#3f6212');
    expect(GROUP_COLOUR_SLOTS[6].light).toBe('#c2410c');
    expect(GROUP_COLOUR_SLOTS[11].light).toBe('#0f766e');
  });

  it('defaults the six prototype groups to slots 0 to 5', () => {
    expect(DEFAULT_GROUP_SLOTS).toEqual({ ip: 0, email: 1, ticket: 2, domain: 3, url: 4, user: 5 });
  });
});

describe('isSlotIndex', () => {
  it('accepts 0 to 11 and nothing else', () => {
    expect(isSlotIndex(0)).toBe(true);
    expect(isSlotIndex(11)).toBe(true);
    expect(isSlotIndex(12)).toBe(false);
    expect(isSlotIndex(-1)).toBe(false);
    expect(isSlotIndex(1.5)).toBe(false);
    expect(isSlotIndex('3')).toBe(false);
    expect(isSlotIndex(undefined)).toBe(false);
  });
});

describe('resolveGroupSlot', () => {
  it('uses the stored override before anything else', () => {
    expect(resolveGroupSlot('ip', { ip: 7 }, ['ip', 'email'])).toBe(7);
  });

  it('ignores an override that is not a valid slot', () => {
    expect(resolveGroupSlot('ip', { ip: 99 }, ['ip'])).toBe(0);
    expect(resolveGroupSlot('ip', { ip: -1 }, ['ip'])).toBe(0);
  });

  it('falls back to the named default', () => {
    expect(resolveGroupSlot('url', undefined, ['url'])).toBe(4);
    expect(resolveGroupSlot('ticket', {}, ['ip', 'ticket'])).toBe(2);
  });

  it('gives an unnamed group the lowest slot no known group uses', () => {
    expect(resolveGroupSlot('mac', undefined, ['ip', 'email', 'mac'])).toBe(2); // ip and email hold 0 and 1 by default
  });

  it('skips slots taken by overrides when picking a free one', () => {
    expect(
      resolveGroupSlot('mac', { ip: 0, email: 0, phone: 1 }, ['ip', 'email', 'phone', 'mac'])
    ).toBe(2);
  });

  it('treats a group outside the known list as appended to it', () => {
    expect(resolveGroupSlot('draft', undefined, ['ip', 'email'])).toBe(2);
  });

  it('wraps to slot 0 when all twelve are taken', () => {
    const groups = Array.from({ length: 13 }, (_, i) => `g${i}`);
    const slots = assignGroupSlots(undefined, groups);
    for (let i = 0; i < 12; i++) expect(slots.get(`g${i}`)).toBe(i);
    expect(slots.get('g12')).toBe(0);
    expect(resolveGroupSlot('g12', undefined, groups)).toBe(0);
  });

  it('assigns the same slot on every call for the same term order', () => {
    const groups = ['ip', 'mac', 'guid', 'phone'];
    const first = assignGroupSlots({ guid: 9 }, groups);
    const second = assignGroupSlots({ guid: 9 }, groups);
    expect([...first.entries()]).toEqual([...second.entries()]);
    expect(first.get('mac')).toBe(1);
    expect(first.get('phone')).toBe(2);
    expect(first.get('guid')).toBe(9);
  });

  it('keeps overrides and defaults fixed whatever the term order', () => {
    const colours = { guid: 9 };
    const a = assignGroupSlots(colours, ['ip', 'guid', 'url']);
    const b = assignGroupSlots(colours, ['url', 'guid', 'ip']);
    expect(a.get('ip')).toBe(b.get('ip'));
    expect(a.get('guid')).toBe(b.get('guid'));
    expect(a.get('url')).toBe(b.get('url'));
  });

  it('assigns free slots in term order, so reordering terms moves only free-slot groups', () => {
    const a = assignGroupSlots(undefined, ['mac', 'phone']);
    const b = assignGroupSlots(undefined, ['phone', 'mac']);
    expect(a.get('mac')).toBe(0);
    expect(b.get('phone')).toBe(0);
  });

  it('counts a repeated group once', () => {
    const slots = assignGroupSlots(undefined, ['mac', 'mac', 'phone']);
    expect(slots.get('mac')).toBe(0);
    expect(slots.get('phone')).toBe(1);
    expect(slots.size).toBe(2);
  });
});
