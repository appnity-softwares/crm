const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:8080';

const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    withCredentials: true
});

socket.on('connect', () => {
    console.log('✅ Connected to socket server:', socket.id);

    const MY_ID = '00000000-0000-0000-0000-000000000002';
    console.log('Joining room...', MY_ID);
    socket.emit('join', MY_ID);

    const testMsg = {
        sender_id: '00000000-0000-0000-0000-000000000001',
        receiver_id: MY_ID,
        content: 'Hello from test script!'
    };

    setTimeout(() => {
        console.log('Sending message...');
        socket.emit('message', testMsg);
    }, 1000);
});

socket.on('message', (msg) => {
    console.log('📩 Received message:', msg);
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('⏳ Timeout waiting for message');
    process.exit(1);
}, 10000);
