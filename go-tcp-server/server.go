package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"time"
	"bufio"
	"strings"
)

const (
	// HOST = "localhost"
	PORT = "1337"
	TYPE = "tcp"
)

func main() {
	listen, err := net.Listen(TYPE, ":"+PORT)
	if err != nil {
		log.Fatal(err)
		os.Exit(1)
	}

	fmt.Println("Launching server...")
	conn, _ := listen.Accept()

	// run loop forever (or until ctrl-c)
	for {
		handleRequest(conn)
	}
}

func handleRequest(conn net.Conn) {
	message, _ := bufio.NewReader(conn).ReadString('\n')

	fmt.Print("Message Received:", string(message))

	time := time.Now().Format(time.ANSIC)
    newmessage := strings.ToUpper(message)

    responseStr := fmt.Sprintf("Your message is: %v. Received time: %v", newmessage, time)

    conn.Write([]byte(responseStr + "\n"))
}
