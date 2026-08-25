import { paginateLifts, CATALOG_PAGE_SIZE } from '../useConfigScreen';

// The catalog grows without bound — every exercise the user has ever created
// lives there — so Config renders it a page at a time instead of dropping
// dozens of tall cards into one scroll view.
describe('paginateLifts', () => {
  const liftsOf = (count) =>
    Array.from({ length: count }, (_, index) => ({ id: `ex-${index + 1}` }));

  it('shows a full page and offers the rest', () => {
    const result = paginateLifts(liftsOf(12), CATALOG_PAGE_SIZE);

    expect(result.visible).toHaveLength(CATALOG_PAGE_SIZE);
    expect(result.hasMore).toBe(true);
    expect(result.remaining).toBe(12 - CATALOG_PAGE_SIZE);
  });

  it('keeps the catalog order so a card does not move as pages open', () => {
    const result = paginateLifts(liftsOf(8), CATALOG_PAGE_SIZE);

    expect(result.visible.map((lift) => lift.id)).toEqual(['ex-1', 'ex-2', 'ex-3', 'ex-4', 'ex-5']);
  });

  it('offers nothing more once the last page fits exactly', () => {
    const result = paginateLifts(liftsOf(CATALOG_PAGE_SIZE), CATALOG_PAGE_SIZE);

    expect(result.visible).toHaveLength(CATALOG_PAGE_SIZE);
    expect(result.hasMore).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('shows a short catalog whole', () => {
    const result = paginateLifts(liftsOf(3), CATALOG_PAGE_SIZE);

    expect(result.visible).toHaveLength(3);
    expect(result.hasMore).toBe(false);
  });

  it('handles an empty catalog without offering a page that is not there', () => {
    const result = paginateLifts([], CATALOG_PAGE_SIZE);

    expect(result.visible).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.remaining).toBe(0);
  });

  // Deleting exercises while several pages are open shrinks the list below the
  // count. Slicing past the end must not resurrect a "load more" button.
  it('survives a catalog that shrank below what was already revealed', () => {
    const result = paginateLifts(liftsOf(2), 20);

    expect(result.visible).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
