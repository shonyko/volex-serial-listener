export const LogLevel = {
	ALL: 0,
	TAGGED: 1,
	DEBUG: 2,
	DATA: 3,
	NONE: 4,
};

let _logLevel = LogLevel.DATA;

export function setloglevel(level) {
	_logLevel = level;
}

export function log(data) {
	switch (_logLevel) {
		case LogLevel.ALL:
			console.log(data);
			break;
		case LogLevel.TAGGED:
			if (/^\[.*]/.test(data)) console.log(data);
			break;
		case LogLevel.DEBUG:
			if (/^\[log]/.test(data)) return console.log(data);
			break;
		case LogLevel.DATA:
			if (/^\[tx]/.test(data)) console.log(data);
			break;
	}
}
