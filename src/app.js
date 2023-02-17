const app = require('express')();
const https = require('https').Server(app);
const http = require('http').Server(app);
const io = require('socket.io')(http);
let ConnectedUser = require('./models/connected-user');
const fs = require("fs")
const path = require("path");


const reportsInUse = new Map();

app.use('/', require('./routes/healthcheck.routes'));



io.sockets.on("connection", socket => {

    socket.on("acquireReport", (templateId, sso) => {     
        if (reportsInUse.has(templateId)){
            io.sockets.to(reportsInUse.get(templateId).currentSocket).emit('assignAttempt', sso, socket.id);
        } else {
            var newUser = new ConnectedUser();
            newUser.sso = sso;
            newUser.currentSocket = socket.id
            reportsInUse.set(templateId, newUser);
        }
        console.log(reportsInUse);
    })

    socket.on("response", (resMsg, reqSocket) => {
        io.sockets.to(reqSocket).emit('response', resMsg);
    })

    socket.on("userLeft", (templateId) => {
        reportsInUse.delete(templateId);
        console.log(reportsInUse);
    })

    socket.on("updateUser", (templateId, sso) => { 
        if (reportsInUse.has(templateId)) {
        reportsInUse.get(templateId).currentSocket = socket.id;
        } else {
            var newUser = new ConnectedUser();
            newUser.sso = sso;
            newUser.currentSocket = socket.id
            reportsInUse.set(templateId, newUser);
        }
        console.log(reportsInUse);
    })

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} has disconnected`);
        var key = getByValue(reportsInUse, socket.id); 
        reportsInUse.delete(key);
        console.log(reportsInUse);
    })
    
    console.log(`Socket ${socket.id} has connected`);

  });

  const options = {
    cert: fs.readFileSync(path.resolve(__dirname, "../cert.crt"))
  };

  https.listen(8080, () => {
    console.log('Listening on port 8080');
  });

  function getByValue(map, searchValue) {
    for (let [key, value] of map.entries()) {
      if (value.currentSocket === searchValue)
        return key;
    }
  }