const http = require('http');
const io = require('socket.io')

var io_conn = null
var client = null

var back_hostname = null //The host that will receive the requests
var back_port = null //port of host that will recieve the requests

var server_port = null

for (var i = 2; i < process.argv.length; i++) {
	let arg = process.argv[i].split('=')
	let arg_name = arg[0] 
	let arg_value = arg[1]

	switch (arg_name) {
		case 'server_port':
			server_port = Number(arg_value);
			break;
		case 'back_hostname':
			back_hostname = arg_value;
			break;
		case 'back_port':
			back_port = arg_value;
			break;
		default:
		  	throw Error("Wrong argument " + arg);
	}
}

if (!back_hostname || !back_port)
	throw new Error(`back_hostname:${back_hostname} or back_port:${back_port} are not defined`)

var server = http.createServer(function (req, resp) {

	if (!io_conn || !client) {
		resp.statusCode = 500
		return resp.end();
	}

	const { headers, method, url } = req;	
	var payload = [];

	req.on('error', (err) => {
		console.error(err);
		resp.statusCode = 500
		return resp.end('error request server side');
	})
	.on('data', chunk => payload.push(chunk))
	.on('end', () => {

		client.emit('request', { hostname: back_hostname, port: back_port, method, url, headers, data: Buffer.concat(payload) }, response => {
			let { statusCode, headers, body } = response

			resp.statusCode = statusCode;
			for (var header in headers)
				resp.setHeader(header, headers[header]);
				
			resp.end(body)
		})
	})
})

io_conn = io(server, {path: '/connection_session'});

io_conn.on('connection', socket => {
	console.log("Client connected", new Date())
	client = socket
	socket.on('disconnect', () => client = null)
})
server_port = server_port || 3000;
server.listen(server_port);

console.log(`
 -> Proxy server running at port ${server_port}
 -> Forwarding all HTTP traffic to client's ${back_hostname}:${back_port}
`)