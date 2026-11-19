/** Minimal protobuf wire-format writer/reader (varint, length-delimited), enough for pprof. */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class ProtoWriter {
	private buffer = new Uint8Array(1_024);
	private length = 0;

	private ensure(extra: number): void {
		if (this.length + extra <= this.buffer.length) return;
		let size = this.buffer.length * 2;
		while (size < this.length + extra) size *= 2;
		const grown = new Uint8Array(size);
		grown.set(this.buffer.subarray(0, this.length));
		this.buffer = grown;
	}

	/** Unsigned varint of a non-negative safe integer or bigint. */
	varint(value: number | bigint): void {
		this.ensure(10);
		if (typeof value === "bigint") {
			let remaining = BigInt.asUintN(64, value);
			while (remaining >= 0x80n) {
				this.buffer[this.length++] = Number(remaining & 0x7fn) | 0x80;
				remaining >>= 7n;
			}
			this.buffer[this.length++] = Number(remaining);
			return;
		}
		let remaining = value;
		while (remaining >= 0x80) {
			this.buffer[this.length++] = (remaining % 0x80) | 0x80;
			remaining = Math.floor(remaining / 0x80);
		}
		this.buffer[this.length++] = remaining;
	}

	private tag(field: number, wireType: number): void {
		this.varint(field * 8 + wireType);
	}

	/** Varint field; zero (the proto3 default) is omitted. */
	uint(field: number, value: number | bigint): void {
		if (value === 0 || value === 0n) return;
		this.tag(field, 0);
		this.varint(value);
	}

	bytes(field: number, value: Uint8Array): void {
		this.tag(field, 2);
		this.varint(value.length);
		this.ensure(value.length);
		this.buffer.set(value, this.length);
		this.length += value.length;
	}

	string(field: number, value: string): void {
		this.bytes(field, encoder.encode(value));
	}

	/** Length-delimited sub-message (always written, even when empty). */
	message(field: number, build: (writer: ProtoWriter) => void): void {
		const child = new ProtoWriter();
		build(child);
		this.bytes(field, child.finish());
	}

	/** Packed repeated varints. */
	packed(field: number, values: readonly number[]): void {
		if (values.length === 0) return;
		const child = new ProtoWriter();
		for (const value of values) child.varint(value);
		this.bytes(field, child.finish());
	}

	finish(): Uint8Array {
		return this.buffer.slice(0, this.length);
	}
}

export interface ProtoField {
	bytes?: Uint8Array;
	field: number;
	varint?: bigint;
}

/** Reads every field of a message. Fixed32/64 fields are skipped. */
export function readFields(data: Uint8Array): ProtoField[] {
	const fields: ProtoField[] = [];
	let position = 0;
	const readVarint = (): bigint => {
		let result = 0n;
		let shift = 0n;
		for (;;) {
			const byte = data[position++];
			if (byte === undefined) throw new Error("truncated protobuf varint");
			result |= BigInt(byte & 0x7f) << shift;
			if ((byte & 0x80) === 0) return result;
			shift += 7n;
		}
	};
	while (position < data.length) {
		const key = Number(readVarint());
		const field = key >>> 3;
		const wireType = key & 7;
		if (wireType === 0) fields.push({ field, varint: readVarint() });
		else if (wireType === 2) {
			const size = Number(readVarint());
			if (position + size > data.length) throw new Error("truncated protobuf message");
			fields.push({ bytes: data.subarray(position, position + size), field });
			position += size;
		} else if (wireType === 1) position += 8;
		else if (wireType === 5) position += 4;
		else throw new Error(`unsupported protobuf wire type ${wireType}`);
	}
	return fields;
}

/** Expands a packed (or unpacked) repeated varint field. */
export function packedValues(fields: ProtoField[], field: number): number[] {
	const values: number[] = [];
	for (const entry of fields) {
		if (entry.field !== field) continue;
		if (entry.varint !== undefined) values.push(Number(entry.varint));
		else if (entry.bytes) {
			let position = 0;
			const bytes = entry.bytes;
			while (position < bytes.length) {
				let result = 0n;
				let shift = 0n;
				for (;;) {
					const byte = bytes[position++] as number;
					result |= BigInt(byte & 0x7f) << shift;
					if ((byte & 0x80) === 0) break;
					shift += 7n;
				}
				values.push(Number(BigInt.asIntN(64, result)));
			}
		}
	}
	return values;
}

export function decodeUtf8(bytes: Uint8Array): string {
	return decoder.decode(bytes);
}
