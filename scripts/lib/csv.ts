import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Minimal CSV line parser: handles quoted fields and "" escapes.
export function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quoted) {
			if (ch === '"' && line[i + 1] === '"') field += line[i++];
			else if (ch === '"') quoted = false;
			else field += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === ',') {
			out.push(field);
			field = '';
		} else field += ch;
	}
	out.push(field);
	return out;
}

export type Record_ = Record<string, string>;

// Yields one object per row, keyed by the header names.
export function* readCsv(path: string): Generator<Record_> {
	const [header, ...lines] = readFileSync(path, 'utf8').trimEnd().split('\n');
	const cols = parseCsvLine(header);
	for (const line of lines) {
		const fields = parseCsvLine(line);
		const row: Record_ = {};
		for (let i = 0; i < cols.length; i++) row[cols[i]] = fields[i] ?? '';
		yield row;
	}
}

// Every row of every CSV in a directory, with the file it came from.
export function* readCsvDir(dir: string): Generator<{ file: string; row: Record_ }> {
	for (const file of readdirSync(dir).filter((f) => f.endsWith('.csv')).sort()) {
		for (const row of readCsv(join(dir, file))) yield { file, row };
	}
}
