var express = require('express'),
    app = express(),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	bodyParser = require('body-parser'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);
   
app.use(express.static(__dirname + '/www'));   
app.set('views', __dirname + '/www');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser());
app.use(session({secret: "My@!23Secret#321Key", resave:true, saveUninitialized:true}));
var loginController = require('./controller/loginController');
loginController(app);
//bind the server to the 80 port
//server.listen(3000);//for local test
server.listen(process.env.PORT || 3000);//publish to heroku
//server.listen(process.env.OPENSHIFT_NODEJS_PORT || 3000);//publish to openshift
//console.log('server started on port'+process.env.PORT || 3000);
var users = [];
var socketIds = []
//handle the socket
io.sockets.on('connection', function(socket) {
	socket.emit('connected');
	console.log('New Connection!!');
    //new user login
    socket.on('login', function(userId) {
		console.log('Logging in with userId : '+userId);
        if (users.indexOf(userId) > -1) {
			console.log('User already there : '+userId);
			users.splice(users.indexOf(userId), 1);
            socketIds.splice(users.indexOf(userId), 1);
            console.log('Removed prexisting user : '+userId);
        }
		console.log('Login with userId : '+userId);
		socket.userId = userId;
		users.push(userId);
		socketIds[users.indexOf(userId)] = socket.id;
		socket.emit('loginSuccess', userId);
		console.log('Socket index for user '+userId+' : '+users.indexOf(userId));
		io.sockets.emit('system', userId, users.length, 'login');
		console.log('All user on new connection : '+users);
    });
	
    //user leaves
    socket.on('disconnect', function() {
        if (socket.userId != null) {
			console.log('disconnected');
            users.splice(users.indexOf(socket.userId), 1);
            socketIds.splice(socketIds.indexOf(socket.id), 1);
            socket.broadcast.emit('system', socket.userId, users.length, 'logout');
        }
    });
    //new message get
    socket.on('postMsg', function(data) {
		console.log('Data : '+data);
		var json = JSON.parse(data);
		//console.log('All user on post msg : '+users);
		console.log(''+socket.userId+' to '+json.receiverId+' : '+json.messageText);
		console.log('User '+json.receiverId+' index : '+users.indexOf(json.receiverId));
		var socketIndex = users.indexOf(json.receiverId);
		if(socketIndex > -1){
			console.log('Sending to socket at : '+socketIndex);
			var socketId = socketIds[socketIndex];
			if(io.sockets.connected[socketId]){
				io.sockets.connected[socketId].emit('newMsg', data);
			}else{
				console.log('No Socket found');
			}
		}else{
			console.log('No Socket index');
		}
		
		//Update msg status sent to server (Sent/Delivered/Recieved)
		var msgStatus = {
			"messageId" : json.messageId,
			"senderId" : json.senderId,
			"receiverId" : json.receiverId,
			"status": "SENT"
		}
		socket.emit('msgStatusChanged', JSON.stringify(msgStatus));
		console.log('msgStatusChanged '+ socket.userId);
		
    });
	
	//message status changed
    socket.on('updateMessageStatus', function(data) {
		//console.log('Data : '+data);
		var json = JSON.parse(data);
		console.log('User '+json.senderId+', message : '+json.messageId + ', status : '+json.status);
		var socketIndex = users.indexOf(json.senderId);
		if(socketIndex > -1){
			console.log('Sending to socket at : '+socketIndex);
			var socketId = socketIds[socketIndex];
			if(io.sockets.connected[socketId]){
				io.sockets.connected[socketId].emit('msgStatusChanged', data);
			}else{
				console.log('No Socket found');
			}
		}else{
			console.log('No Socket index');
		}
    });
	
	//On getting offer
    socket.on('offer', function(to, offer) {
		console.log('Offer from : '+ socket.userId + ' to '+to);
		var socketIndex = users.indexOf(to);
		if(socketIndex > -1){
			console.log('Sending to socket at : '+socketIndex);
			var socketId = socketIds[socketIndex];
			if(io.sockets.connected[socketId]){
				io.sockets.connected[socketId].emit('offer', socket.userId, offer);
			}else{
				console.log('No Socket found');
			}
		}else{
			console.log('No Socket index');
		}
    });
	
	//On getting answer
    socket.on('answer', function(to, answer) {
		console.log('Answer from : '+ socket.userId + ' to '+to);
		var socketIndex = users.indexOf(to);
		if(socketIndex > -1){
			console.log('Sending to socket at : '+socketIndex);
			var socketId = socketIds[socketIndex];
			if(io.sockets.connected[socketId]){
				io.sockets.connected[socketId].emit('answer', socket.userId, answer);
			}else{
				console.log('No Socket found');
			}
		}else{
			console.log('No Socket index');
		}
    });
	
	//On getting candidate
    socket.on('candidate', function(to, candidate) {
		console.log('Candidate from : '+ socket.userId + ' to '+to);
		var socketIndex = users.indexOf(to);
		if(socketIndex > -1){
			console.log('Sending to socket at : '+socketIndex);
			var socketId = socketIds[socketIndex];
			if(io.sockets.connected[socketId]){
				io.sockets.connected[socketId].emit('candidate', socket.userId, candidate);
			}else{
				console.log('No Socket found');
			}
		}else{
			console.log('No Socket index');
		}
    });
	
	
});
