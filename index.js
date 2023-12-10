import { LogLevel, setloglevel } from './log.js';
import { openPort } from './port.js';

function onDataRecv(data) {
	if (!/^\[tx]/.test(data)) return;
	data = data.replace('[tx]', '');
	const args = data.split('|');
	if (socket.connected) {
		socket.emit('event', {
			event: Events.PAIR,
			data: {
				mac: args[0],
				type: args[1],
			},
		});
	}
	// const toSend = ['[cmd]', args[0], 'UPC8894AD1', 'erBBjuh7cbnc'].join('|');
}

function sendData(data) {
	const serialport = getPort();
	if (serialport.isOpen) {
		serialport.write(data, err => {
			if (err) {
				console.log(`Error while sending: ${err}`);
			}
		});
	}
}

console.log('Service started.');
setloglevel(LogLevel.TAGGED);
const getPort = openPort(onDataRecv);

import { io } from 'socket.io-client';
import { Events, Services } from './enums.js';

const broker_addr = process.env.BROKER ?? 'localhost:3000';
console.log(`Broker addr: ${broker_addr}`);
const socket = io(`ws://${broker_addr}`);

function register() {
	socket.emit(
		Events.Socket.REGISTER,
		Services.SERIAL_LISTENER,
		({ success, err }) => {
			if (!success) {
				console.log(`Could not register: ${err}`);
				console.log(`Retrying in 2 seconds`);
				return setTimeout(register, 2000);
			}
		}
	);
}

socket.on('connect', _ => {
	console.log('Socket connected!');
	register();
});

socket.on('pair_accept', (data, cb) => {
	if (data == null) {
		console.log('Credentials are required, got null');
		return cb?.({ success: false, err: 'Credentials are required' });
	}
	const toSend = `[cmd]${[data.mac, data.ssid, data.pass].join('|')}`;
	sendData(toSend);
	cb?.({ success: true });
});
