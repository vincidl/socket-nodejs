const app = require('express')();
const keycloak = require('./config/keycloak-config.js').initKeycloak();
const http = require('http').Server(app);
const io = require('socket.io')(http);
let ConnectedUser = require('./models/connected-user');
const fs = require("fs");
const path = require("path");
app.use(keycloak.middleware());

const reportsInUse = new Map();

app.use('/', require('./routes/healthcheck.routes'));

app.get('/', keycloak.protect(), async (_req, res, _next) => {  
   var fullUrl = _req.protocol + '://' + _req.get('host') + _req.originalUrl;
   console.log("Basic " + fullUrl);
   try {
       res.status(200).send("True");
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

  http.listen(8080, () => {
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