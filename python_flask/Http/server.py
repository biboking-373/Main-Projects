import socket

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind(("0.0.0.0", 5000))
server.listen(5)

print("Server waiting...")
conn, addr = server.accept()

data = conn.recv(1024)
print("Received:", data.decode())

conn.send(b"Hello client")
conn.close()
