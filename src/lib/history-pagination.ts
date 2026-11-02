type QueryResult<T> = {
  data: T[] | null;
  count: number | null;
  error: { code?: string; message: string } | null;
};
export type HistoryQuery<T> = () => {
  range(from: number, to: number): PromiseLike<QueryResult<T>>;
};

export function chunks<T>(values: readonly T[], size = 100): T[][] {
  const parts: T[][] = [];
  for (let start = 0; start < values.length; start += size)
    parts.push(values.slice(start, start + size));
  return parts;
}

// Factories must retain the same filters and deterministic ordering on each call.
export async function historyPage<T>(
  query: HistoryQuery<T>,
  requestedPage: number,
  size: number,
) {
  let page = Math.max(1, Math.floor(requestedPage) || 1);
  let result = await query().range((page - 1) * size, page * size - 1);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (result.error?.code === "PGRST103") {
      const probe = await query().range(0, 0);
      if (probe.error) throw Error(probe.error.message);
      page = Math.min(page, Math.max(1, Math.ceil((probe.count || 0) / size)));
      result = await query().range((page - 1) * size, page * size - 1);
      if (result.error?.code === "PGRST103") continue;
    }
    if (result.error) throw Error(result.error.message);
    const count = result.count || 0;
    const lastPage = Math.max(1, Math.ceil(count / size));
    if (page <= lastPage) return { data: result.data || [], count, page };
    page = lastPage;
    result = await query().range((page - 1) * size, page * size - 1);
  }
  // Cleanup may remove another page while it is being read. Fall back once to
  // the first page, without swallowing network or permission errors.
  if (result.error?.code === "PGRST103") {
    page = 1;
    result = await query().range(0, size - 1);
  }
  if (result.error) throw Error(result.error.message);
  return { data: result.data || [], count: result.count || 0, page };
}

// Merge disjoint, identically ordered partitions. Fetch only lightweight sort
// keys here; callers load full records for the final visible page afterward.
// This keeps request URLs and buffered rows bounded even for large rosters.
export async function partitionedHistoryPage<T>(
  queries: HistoryQuery<T>[],
  requestedPage: number,
  size: number,
  compare: (a: T, b: T) => number,
) {
  if (!queries.length) return { data: [] as T[], count: 0, page: 1 };
  if (queries.length === 1) return historyPage(queries[0], requestedPage, size);

  const streams: { rows: T[]; index: number; offset: number; count: number }[] =
    [];
  // Limit initial concurrency rather than issuing hundreds of requests at once.
  for (const batch of chunks(queries, 4)) {
    const results = await Promise.all(
      batch.map((query) => query().range(0, size - 1)),
    );
    for (const result of results) {
      if (result.error) throw Error(result.error.message);
      streams.push({
        rows: result.data || [],
        index: 0,
        offset: 0,
        count: result.count || 0,
      });
    }
  }
  const count = streams.reduce((total, stream) => total + stream.count, 0);
  const page = Math.max(
    1,
    Math.min(Math.floor(requestedPage) || 1, Math.ceil(count / size)),
  );
  const start = (page - 1) * size;
  const data: T[] = [];
  for (let position = 0; position < start + size; position++) {
    let winner = -1;
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i];
      if (stream.index >= stream.rows.length) continue;
      if (
        winner === -1 ||
        compare(
          stream.rows[stream.index],
          streams[winner].rows[streams[winner].index],
        ) < 0
      )
        winner = i;
    }
    if (winner === -1) break;
    const stream = streams[winner];
    if (position >= start) data.push(stream.rows[stream.index]);
    stream.index++;
    if (position + 1 === start + size) break;
    if (
      stream.index === stream.rows.length &&
      stream.offset + stream.rows.length < stream.count
    ) {
      stream.offset += stream.rows.length;
      const next = await queries[winner]().range(
        stream.offset,
        stream.offset + size - 1,
      );
      if (next.error && next.error.code !== "PGRST103")
        throw Error(next.error.message);
      stream.rows = next.data || [];
      stream.index = 0;
    }
  }
  return { data, count, page };
}

export function sessionScopeFilters(
  scopes: { studentId: string; levelIds: number[] }[],
) {
  const groups: string[] = [];
  let terms: string[] = [];
  for (const scope of scopes) {
    for (const levels of chunks(scope.levelIds)) {
      const term = `and(student_id.eq.${scope.studentId},level_id.in.(${levels.join(",")}))`;
      if (
        terms.length &&
        encodeURIComponent([...terms, term].join(",")).length > 5000
      ) {
        groups.push(terms.join(","));
        terms = [];
      }
      terms.push(term);
    }
  }
  if (terms.length) groups.push(terms.join(","));
  return groups;
}
