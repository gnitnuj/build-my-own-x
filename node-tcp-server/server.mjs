import net from "net";

const port = 1337;
const host = "127.0.0.1";

const server = new net.createServer((socket) => {
  socket.on("data", (data) => {
    console.log(`Data received: ${data}`);
    // console.log(typeof data);
    socket.write(data.toString().toUpperCase());
    // socket.pipe(socket);
  });
});

server.on("error", (err) => {
  throw new Error(err);
});

server.on("connection", (socket) => {
  console.log(
    `Server: ${socket.remoteAddress}:${socket.remotePort} has connected`,
  );
});

server.on("listening", () => {
  const address = server.address();
  console.log(`Opened server on ${address.address}:${address.port}`);
});

server.listen(port, host);

// Use netcat on OSX to test in terminal
// nc 127.0.0.1 1337
