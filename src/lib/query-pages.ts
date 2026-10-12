/* eslint-disable @typescript-eslint/no-explicit-any */
// Each factory creates a fresh, deterministically ordered query for one page.
export async function allRows(factory: () => any): Promise<any[]> {
  const rows: any[] = [];
  for (let start = 0; ; start += 500) {
    const page = await factory().range(start, start + 499);
    if (page.error) throw Error(page.error.message);
    rows.push(...(page.data || []));
    if (!page.data || page.data.length < 500) return rows;
  }
}
export async function rowsForIds(ids: (string | number)[], factory: (ids: (string | number)[]) => any) {
  const rows: any[] = [];
  for (let start = 0; start < ids.length; start += 100) {
    const part = ids.slice(start, start + 100);
    rows.push(...await allRows(() => factory(part)));
  }
  return rows;
}
