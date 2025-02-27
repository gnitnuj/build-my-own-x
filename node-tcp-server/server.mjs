import net from "net";

const port = 1337;
const host = "127.0.0.1";

const connectedClients = [];

const server = new net.createServer((clientSocket) => {
  // moved to connection listener
});

server.on("error", (err) => {
  throw new Error(err);
});

server.on("connection", (clientSocket) => {
  console.log(
    `Server: ${clientSocket.remoteAddress}:${clientSocket.remotePort} has connected`,
  );

  clientSocket.on("data", (data) => {
    connectedClients.forEach((cc) => {
      if (clientSocket != cc) cc.write(data.toString().toUpperCase());
    });
    // console.log(typeof data);
    // clientSocket.pipe(clientSocket);
  });

  connectedClients.push(clientSocket);
});

server.on("listening", () => {
  const address = server.address();
  console.log(`Opened server on ${address.address}:${address.port}`);
});

server.listen(port, host);

// Use netcat on OSX to test in terminal
// nc 127.0.0.1 1337
