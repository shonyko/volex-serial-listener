import { SerialPort, ReadlineParser } from 'serialport';
import { log } from './log.js';

function queryPort(cb) {
	SerialPort.list()
		.then(ports => {
			ports = ports.filter(x => {
				const path = x.path.toLowerCase();
				return path.includes('usb') || path.includes('com');
			});
			// console.log(`[LIST]: `);
			// for (let port of ports) {
			// 	console.log(port);
			// }
			if (ports.length <= 0) {
				console.log('No port found. Retrying in 2 seconds.');
				setTimeout(_ => queryPort(cb), 2000);
				return;
			}
			cb(ports[0].path);
		})
		.catch(err => {
			console.log(`[ERR}: ${err}. Retrying in 2 seconds.`);
			setTimeout(_ => queryPort(cb), 2000);
		});
}

async function queryPortAsync() {
	return new Promise((resolve, _) => queryPort(resolve));
}

async function getPort() {
	return process.env.PORT ?? (await queryPortAsync());
}

const BAUD_RATE = process.env.BAUD_RATE ?? 9600;

let serialport;
let parser;
let lastTimestamp;
let timeoutTimer;
let reconnectionTimer;
let connected = false;
let onDataRecv;

function queueReconnect() {
	reconnectionTimer = setTimeout(setup, 2000);
}

function queueTimeout() {
	timeoutTimer = setTimeout(checkTimeout, 1000);
}

function checkTimeout() {
	if (connected && Date.now() - lastTimestamp > 3000) {
		console.log('port timeout');
		parser.destroy();
		serialport.destroy();
		return;
	}
	queueTimeout();
}

async function setup() {
	const PORT = await getPort();

	serialport = new SerialPort({
		path: PORT,
		baudRate: BAUD_RATE,
		autoOpen: false,
	});

	serialport.on('open', _ => {
		lastTimestamp = Date.now();
		connected = true;
		queueTimeout();
		console.log(`Connected to ${PORT}.`);
	});
	serialport.on('error', err =>
		console.log(`An unexpected error has occured: ${err}`)
	);
	serialport.on('close', _ => {
		console.log(`Disconnected from ${PORT}.`);
		connected = false;
		clearTimeout(timeoutTimer);
		queueReconnect();
	});
	// serialport.on('data', data => console.log(`data: ${data}`));

	parser = serialport.pipe(new ReadlineParser());
	parser.on('data', data => {
		lastTimestamp = Date.now();
		data = data.trim();
		log(data);
		onDataRecv(data);
	});

	console.log(`Trying to open ${PORT}...`);
	serialport.open(err => {
		if (!err) return;

		if (err.message.includes('Cannot lock port')) {
			console.log('Critical error detected. Restarting service');
			process.exit();
			return;
		}

		console.log(`Could not open ${PORT}: ${err}`);
		console.log('Retrying in 2 seconds');
		queueReconnect();
	});
}

export function openPort(dataCallback) {
	onDataRecv = dataCallback;
	setup();
	return _ => serialport;
}
