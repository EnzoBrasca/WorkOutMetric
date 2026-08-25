import { buildRoutinePatch, haveSameMembers } from '../useRoutinesScreen';

// Editing a routine writes through two different endpoints (the routine's own
// fields, and its membership). These decide what is worth sending — a PATCH
// carrying untouched fields would rewrite them, and a membership sync with no
// real change would delete-and-reinsert rows for nothing.
describe('buildRoutinePatch', () => {
  const original = {
    name: 'Empuje A',
    type: 'PUSH',
    description: 'Pecho y hombro',
  };

  it('sends nothing when nothing changed', () => {
    expect(buildRoutinePatch({ ...original }, original)).toEqual({});
  });

  it('sends only the renamed field', () => {
    expect(buildRoutinePatch({ ...original, name: 'Empuje B' }, original)).toEqual({
      name: 'Empuje B',
    });
  });

  it('sends the retag on its own', () => {
    expect(buildRoutinePatch({ ...original, type: 'LEGS' }, original)).toEqual({ type: 'LEGS' });
  });

  it('treats a routine with no type as an empty tag, not a change', () => {
    const untagged = { name: 'Sábado', type: null, description: null };

    expect(buildRoutinePatch({ name: 'Sábado', type: '', description: '' }, untagged)).toEqual({});
  });

  it('sends an emptied type so the tag can be cleared', () => {
    expect(buildRoutinePatch({ ...original, type: '' }, original)).toEqual({ type: '' });
  });
});

describe('haveSameMembers', () => {
  it('ignores the order the exercises were tapped in', () => {
    expect(haveSameMembers(['ex-2', 'ex-1'], ['ex-1', 'ex-2'])).toBe(true);
  });

  it('spots an added exercise', () => {
    expect(haveSameMembers(['ex-1', 'ex-2'], ['ex-1'])).toBe(false);
  });

  it('spots a removed exercise', () => {
    expect(haveSameMembers(['ex-1'], ['ex-1', 'ex-2'])).toBe(false);
  });

  it('treats two empty lists as unchanged', () => {
    expect(haveSameMembers([], [])).toBe(true);
  });
});
