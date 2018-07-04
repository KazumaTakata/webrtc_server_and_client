const WebSocket = require('ws');


const wss = new WebSocket.Server({ port: 8182 });


wss.on('connection', function connection(ws) {
  console.log("connect")


  ws.on('message', function incoming(message) {
    console.log(message)
    wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
})
});
