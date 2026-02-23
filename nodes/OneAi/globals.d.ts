declare class URLSearchParams {
	constructor(init?: Record<string, string>);
	set(name: string, value: string): void;
	toString(): string;
}

declare const crypto: {
	randomUUID(): string;
};

declare class AbortSignal {
	readonly aborted: boolean;
	addEventListener(type: 'abort', listener: () => void): void;
	static timeout(ms: number): AbortSignal;
}

interface WebSocketCloseEvent {
	readonly code: number;
	readonly reason: string;
}

interface WebSocketMessageEvent {
	readonly data: string | ArrayBuffer;
}

declare class WebSocket {
	constructor(url: string | URL, protocols?: string | string[]);
	readonly readyState: number;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	addEventListener(type: 'open', listener: () => void): void;
	addEventListener(
		type: 'message',
		listener: (event: WebSocketMessageEvent) => void,
	): void;
	addEventListener(
		type: 'close',
		listener: (event: WebSocketCloseEvent) => void,
	): void;
	addEventListener(type: 'error', listener: (event: unknown) => void): void;
}
