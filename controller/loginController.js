let jwt = require('jsonwebtoken');
let config = require('../config');
let middleware = require('../middleware');
var autoIncrement = require("mongodb-autoincrement");
var ObjectID = require('mongodb').ObjectID;
var MongoClient = require('mongodb').MongoClient;
var path = require('path');
var url = 'mongodb://localhost:27017/mydb';
var multer = require('multer');
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'www/upload/images')
    },
    filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now()+ path.extname(file.originalname))
    }
});
var upload = multer({storage: storage});
module.exports = (function(app){
	// Main page
	app.get('/', function(req,res){
		var isLogin = false;
		if(req.session.user_id){
			isLogin = true;
		}
		res.render('index',{login:isLogin, userId:req.session.user_id, token:req.session.token});
	});
	// Login TO DB==================================================================
	app.post('/login', function(req,res){
		MongoClient.connect(url, function(err, db) {
			console.log("Database created if not exist!");
			db.collection('users').findOne({email: req.body.username, password: req.body.password}, function(err, user) {
				if(!err){
					if(user===null){
						console.log("Login invalid");
						res.status(401)
						res.json({"error": "Login failed"} );
					} else {
						let token = jwt.sign({userId: user._id},
							config.secret,
							{ expiresIn: '30d'} //30 days
						);
						console.log("Login Success");
						req.session.user_id = user._id;
						req.session.token = token;
						var authResponse = {"user_id" : user._id, "authenticated" : true, "access_token" : token};
						res.json(authResponse);
					}
				}
			});
		});
	});
	//register to DB================================================================
	app.post('/register', function(req,res){
		var obj = JSON.stringify(req.body);
		console.log("Final reg Data : "+obj);
		var jsonObj = JSON.parse(obj);
		MongoClient.connect(url, function(err, db) {
			if(!err){
				console.log("Connected to Database!");
				autoIncrement.getNextSequence(db, "users", "_id", function (err, autoIndex) {
					if(!err){
						jsonObj._id = autoIndex;
						console.log("Inserting Data : "+JSON.stringify(jsonObj));
						db.collection("users").insertOne(jsonObj, function(err, result) {
							if (!err){
								db.collection('users').findOne({email: req.body.email, password: req.body.password}, function(err, user) {
								if(!err){
									if(user===null){
										console.log("Login invalid");
										res.status(401)
										res.json({"error": "Login failed"} );
									} else {
										let token = jwt.sign({userId: user._id},
											config.secret,
											{ expiresIn: '24h'}
										);
										console.log("Login Success");
										req.session.user_id = user._id;			
										user.access_token = token;
										res.json(user);
									}
								}
							});
							}else{
								console.log("Register Failed");
								res.send("Register Failed");
							}
							db.close();
						});		
					}else{
						console.log("Register Failed");
						res.send("Register Failed");
					}				
				});
			}else{
				console.log("Not connected to database");
			}
		});
	});
	//Get All users================================================================
	app.get('/users', middleware.checkToken, function(req,res){
		var userId = req.decoded.userId;
		MongoClient.connect(url, function(err, db) {
			if(!err){
				db.collection("users").find({'_id': {$ne : userId}},{password:0}).toArray(function(err, result) {
					if (!err){
						result.forEach(function(part){
							part.pic = "http://10.0.2.2:3000/upload/profile/" + part.pic;
						});
						res.json(result);
						db.close();
					}else{
						res.status(501)
						res.json({"error": "Internal Server Error"});
					}	
				});	
			}else{
				console.log("Not connected to database");
			}
		});
	});
	//Delete users by Id================================================================
	app.delete('/users/:id', function(req,res){
		console.log("Deleting user :"+req.params.id);
		var userId = req.params.id;
		MongoClient.connect(url, function(err, db) {
			if(!err){
				db.collection("users").findOneAndDelete({_id: Number(userId)}, function(err, obj) {
					if (!err){
						console.log(obj);
					}else{
						throw err;
					}
					db.close();
				});
			}else{
				console.log("Not connected to database");
			}
		});
	});
	
	//Media upload API
	app.post('/upload/media', upload.single('file'), (req, res, next) => {
		var json = {
			"uploadPath" : "http://172.16.7.39:3000/upload/images/",
			"fileName": req.file.filename
		}
		res.json(json);
		
	});
});
