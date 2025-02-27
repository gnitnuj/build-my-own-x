import net from "net";
import readline from "readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const port = 1337;
const host = "127.0.0.1";

const CLOSEMSG = "disconnected from client!";
const CONNECTMSG = "connected to client!";

const client = net.createConnection({ host: host, port: port }, async () => {
  console.log(CONNECTMSG);

  const message = await rl.question("Enter a message > ");
  client.write(message);
});

client.on("data", (data) => {
  console.log(`Message received: ${data.toString("utf-8")}`);
});

client.on("close", () => {
  console.log(CLOSEMSG);
});

// const client = new net.Socket();

// client.on("connect", () => {
//   console.log(CONNECTMSG);
// });

// client.on("data", (data) => {
//   console.log(typeof data);
//   console.log(`Data: ${data}`);
// });

// client.on("close", () => {
//   console.log(CLOSEMSG);
// });

// client.connect(port, host, (socket) => {
//   client.write("hello from client!");
//   console.log(socket);
// });
