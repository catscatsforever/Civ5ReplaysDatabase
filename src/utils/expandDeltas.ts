export function expandDeltas(
    rows: [number, string, number][],
    maxTurns: {[key: string]: number},
): Record<string, number | null>[] {
    if (rows.length === 0) return [];

    // sparse[playerKey][turn] = absolute value at that turn
    const sparse = new Map<string, Map<number, number>>();
    const running = new Map<string, number>();
    const maxTurn = 330;

    for (const [turn, key, delta] of rows) {
        if (!sparse.has(key)) sparse.set(key, new Map());
        const prev = running.get(key) ?? 0;
        const abs = prev + delta;
        running.set(key, abs);
        sparse.get(key)!.set(turn, abs);
    }

    const playerKeys = Array.from(sparse.keys());

    let minTurn = Infinity;
    sparse.forEach((turnMap) => {
        for (const t of turnMap.keys()) if (t < minTurn) minTurn = t;
    });
    if (!isFinite(minTurn)) return [];

    const result: Record<string, number | null>[] = [];
    const lastKnown = new Map<string, number | null>(playerKeys.map((k) => [k, null]));

    for (let turn = minTurn; turn <= maxTurn; turn++) {
        const row: Record<string, number | null> = { turn };
        let bEnd: boolean = true;
        for (const key of playerKeys) {
            if (turn >= maxTurns[key]) continue;
            bEnd = false;
            const recorded = sparse.get(key)!.get(turn);
            if (recorded !== undefined) {
                lastKnown.set(key, recorded);
            }
            row[key] = lastKnown.get(key) ?? null;
            if (turn == maxTurns[key] - 1) {
                row[`${key}-End`] = lastKnown.get(key) ?? null;
            }
        }
        if (bEnd) break;

        result.push(row);
    }

    return result;
}
