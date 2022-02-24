const express = require("express")
const path = require("path")
const http = require("http")
const socketio = require("socket.io")
const formatMessage = require("./utils/messages")
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require("./utils/users")

const app = express()
const server = http.createServer(app)
const io = socketio(server)

//Set static folder
app.use(express.static(path.join(__dirname, "public")))

const botName = "LiveChat Bot"

//Run when a client connects
io.on("connection", socket => {
  socket.on("joinRoom", ({username, room}) => {
    const user = userJoin(socket.id, username, room)

    socket.join(user.room)

    //Welcomes current user (only seen on the user's screen)
    socket.emit("message", formatMessage(botName, "Welcome to LiveChat!")) //emits to the single client that is connecting

    //Broadcast when a user connects to the specific room
    socket.broadcast.to(user.room).emit("message", formatMessage(botName, `${user.username} has joined the chat`)) //emits to everyone except the user that is connecting

      //Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room)
    })
  })

  //Runs when the user diconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id)

    if (user) {
      io.to(user.room).emit("message", formatMessage(botName, `${user.username} has left the chat`)) //emits to all users
    }

    //Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room)
    })
  })

  //Listen for chat message
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id)

    io.to(user.room).emit("message", formatMessage(user.username, msg))
  })

})


const PORT = process.env.PORT || 3000

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))