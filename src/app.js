const app = require('express')();
const http = require('http');
const server = http.createServer(app);
//const { Server } = require('socket.io');
//const io = new Server(server);
//const keycloak = require('./config/keycloak-config.js').initKeycloak();
//app.use(keycloak.middleware());
//const https = require('https').Server(app);
const io = require('socket.io')(server);
let ConnectedUser = require('./models/connected-user');
const fs = require("fs");
const path = require("path");


const reportsInUse = new Map();

app.use('/', require('./routes/healthcheck.routes'));

app.get('/ciao', (req, res) => {  
   try {
       res.status(200).send("ciao");
   } catch (error) {
       healthcheck.message = error;
       res.status(503).send();
   }
});

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

    socket.on("userLeft", (templateId, sso) => {
        var key = getBySso(reportsInUse, sso); 
        reportsInUse.delete(key);
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

  /*const options = {
    cert: fs.readFileSync(path.resolve(__dirname, "../cert.crt"))
  };*/

  server.listen(8080, () => {
    console.log('Listening on port 8080');
  });

  function getByValue(map, searchValue) {
    for (let [key, value] of map.entries()) {
      if (value.currentSocket === searchValue)
        return key;
    }
  }

  function getBySso(map, searchValue) {
    for (let [key, value] of map.entries()) {
      if (value.sso === searchValue)
        return key;
    }
  }