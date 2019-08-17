var http = require('http');
var fs = require('fs');
var express = require('express');
//added request to make request to get json body
var request = require('request');
var btoa=require('btoa');
var atob=require('atob');
var mongoClient =require('mongodb').MongoClient;
var schedule=require('node-schedule');
var _my_ip = require('my-local-ip');
var body_parser = require('body-parser');
var urlencodedParser= body_parser.urlencoded({extended:false});
var db, friends,active_friends,setup,_my_name;
var func=require('./functions.js');
mongoClient.connect("mongodb://localhost:27017/MyDb", function(err,database){
	if(err){
		return console.log(err);
	}
	db=database;
	setup=database.collection('setup');
	friends = database.collection('friends');
	active_friends = database.collection('active_friends');
	
});


var app=express();
app.set('view engine','ejs');
app.use('/assets',express.static('assets'));
http.createServer(app).listen(3000);
//if its the first time/everytime lol59
app.get("*",function(req,res,next){
	setup.find().toArray(function(err,data){
		if(data.length<1)
			res.render("setup",{toast:"First make a setup"});
		else if(_my_ip().toString('utf-8')==undefined)
			res.render("setup",{toast:"Connect to LAN"});
		else if((data[0].my_ip).toString('utf-8') != _my_ip().toString('utf-8')){

			//new ip detected, therefore need to update my ip now and ask my active friends to do the same 
			func.update_ip_active_nodes(data[0].my_ip,_my_ip(),function(callback){
				if(callback=="success"){
					func.update_setup_ip(data[0].my_ip, _my_ip());
					res.render('setup',{toast:"Restart the Application"});
				}
				else{
					//next();
					res.render('setup',{toast:":No Active Nodes at the moment, try again after sometime"});
				}
			});
		}
		else{

			next();
		}
	});

});



//nav bar
app.get('/api/stats',function(req,res){
	setup.find().toArray(function(err,data){
	var _my_name,ip,path,_friends=[];
	if (data.length>0){
		_my_name=data[0].name;	
		ip=data[0].my_ip;
		path=data[0].path;
		var counter=0;
		active_friends.find().toArray(function(err,_data){
			if(_data.length==0){
				res.json({
						my_name:_my_name,
						my_ip:ip,
						paths:path,
						cur_ip:_my_ip(),
						friends:_friends,
						});
			}
			_data.forEach(function(elt,index){
				friends.find({"ip":elt.ip}).toArray(function(err,_dt){
					_friends.push({"ip":elt.ip,"name":_dt[0].name});
					counter++;
					if(_data.length==counter)
					{
						res.json({
						my_name:_my_name,
						my_ip:ip,
						paths:path,
						cur_ip:_my_ip(),
						friends:_friends,
						});
					}
				});
			});
		
		});
	}

	});

});

app.get('/friend_list',function(req,res){
		db.collection('friends',function(err,collection){
		collection.find().toArray(function(err,data){
			if (err)
				return console.log(err);
			//console.log(data);
		res.status(200).send(data);
		});
	});
});
app.get('/video/:path/:name/:ip',function(req,res){
	_data=[req.params.ip,req.params.path,req.params.name];
	res.render('video',{data:_data});
});
//video stream
app.get('/video_stream/:path/:name',function(req,res){
	//params as file name to be saved as
	var path=atob(req.params.path);
	//console.log(path);
	//creating a binary file with given name of 0 size
	var stat = fs.statSync(path);
	var fileSize = stat.size;
	var range = req.headers.range;
  	if (range) {
    	var parts = range.replace(/bytes=/, "").split("-")
    	var start = parseInt(parts[0], 10)
    	var end = parts[1] ? parseInt(parts[1], 10): fileSize-1
    	var chunksize = (end-start)+1
    	var file = fs.createReadStream(path, {start, end})
    	var head = {
      		'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      		'Accept-Ranges': 'bytes',
      		'Content-Length': chunksize,
      		'Content-Type': 'video/mp4',
    	}
    	res.writeHead(206, head);
    	file.pipe(res);
  	}
  	else{
    	var head = {
     	 'Content-Length': fileSize,
      	'Content-Type': 'video/mp4',
    	}
    	res.writeHead(200, head);
    	fs.createReadStream(path).pipe(res);
  	}
});
app.get('/add_mutal_friend',function(req,res){
	func.add_mutal_friend();
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("done");
});

//get all available files
app.get('/list_files',function(req,res){
	func.list_files(req.query.filter.trim(),function(result){
		res.send(JSON.stringify(result));
	});
	
});
//recieve to update a ip update request.
app.get('/receive_ip_update/:old_ip/:new_ip',function(req,res){
	var old_ip=req.params.old_ip;
	var new_ip=req.params.new_ip;
	func.update_ip(old_ip,new_ip);
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("Updated");

});

app.get('/add_found_friends',function(req,res){
	db.collection('friends',function(err,collection){
		collection.find().toArray(function(err,data){
			if(err)
				return console.log(err);
			//console.log(data[ip]);
		});
	});
});

app.post('/add_friend',urlencodedParser,function(req,res){
	console.log(req.body);
	var ip=req.body.ip;
	var name=req.body.name;
	func.add_friend(ip,name,1);
	res.render('add_friend',{toast:"New Ip Added"});
	
});

app.get('/add_friend',function(req,res){
	res.render('add_friend');

});

//store this ping detail in pings database for mongo. to get the last ping data
app.get('/receive_pings',function(req,res){
	var name = req.query.name;
	var ip=(req.connection.remoteAddress).substring(7,(req.connection.remoteAddress).length);
	func.receive_pings(ip,name,1);
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("Ping made");
});
app.get('/download/:path/:name',function(req,res){
	//params as file name to be saved as
	var file_path=atob(req.params.path);
	console.log(file_path);
	//creating a binary file with given name of 0 size
//	var downloadFile=fs.createWriteStream(fileName,{'flags':'a'});
	//calling download chunks function
///	download_chunks(paths[0],downloadFile);
	res.setHeader('Content-disposition', 'attachment; filename=' + req.params.name);
	var fileStream = fs.createReadStream(file_path);
	fileStream.pipe(res);
	res.writeHead(200,{'Context-Type':'text/plain'});
	
});
app.get('/search',function(req,res){
	res.render('search');
	
});

app.get('/my_friends',function(req,res){
	friends.find().toArray(function(err,_data){
		console.log(JSON.stringify(_data));
		res.render('my_friends',{data:(_data)});
	});
	
	
});

app.post('/search',urlencodedParser,function(req,res){
	func.search_all(req.body.query,function(result,err){

		result.forEach(function(elt,index){
			elt["file_name"]=(elt.path).substring((elt.path).lastIndexOf("/")+1);
			elt.path=(btoa(elt.path));
			elt["is_video"]=false;
			if ((elt["file_name"].substring((elt["file_name"]).lastIndexOf(".")+1))=="mp4")
				elt["is_video"]=true;
		});
		if(err)
			res.render('search_all',{data:result,toast:err});
		else
			res.render('search_all',{data:result});
	});
});

app.get('/setup',function(req,res){
	res.render('setup');

});
app.post('/setup',urlencodedParser,function(req,res){
	//console.log(req.body);
	setup.updateOne({'name':req.body.name},{'name':req.body.name,'my_ip':_my_ip(),'path':req.body.path},{upsert:true});
	res.render('setup',{toast:"Restart the Application"});
});
app.get('/test',function(req,res){
	console.log(fs.existsSync("/home/prince/Download"));
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("done");
});

app.get('/',function(req,res){
	res.render('search');
});	
app.get('/*',function(req,res){
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("Wrong Page :-)");
});

console.log("server running at port 3000");
console.log(_my_ip());
mongoClient.connect("mongodb://localhost:27017/MyDb", function(err,db){
	db.collection('setup').find().toArray(function(err,_data){
		if(_data[0]){
			_my_name=_data[0].name;
			if(err){
				console.log("error");
			}}
	});
});

//infinite pings to friends after 30sec interval.
//code in am_active.js file
var am_active = schedule.scheduleJob('*/5 * * * * *', function(){
	func.update_active_friends();
  	friends.find().each(function(err,data){
		if(err)
			return console.log(err);
		if (data==null){
			return;
		}
		active_friends.find({"ip":data.ip}).count().then(function(val){
			if(!val){
				friends.find({"ip":data.ip},{"_id":0,"chance":1}).toArray(function(_err,_data){
				if(_data[0].chance){
					http.get({hostname:data.ip,port:3000,path:"/receive_pings?name="+_my_name ,agent:false},function(res,err){
						if(res.statusCode == 200){
							func.receive_pings(data.ip,data.name,0);
						}
						res.on("data",function(chunk){
							console.log("sent ping"+data.ip+" "+Date.now());
						});
					}).on("error",function(err){
						console.log(data.ip+" is dead at the moment"+Date.now());
					});
				}
				});
			}
		});
		
	});
});
//adding mutual friends after every 30 secs
var mutual_friend=schedule.scheduleJob('*/30 * * * * *',function(){
	func.add_mutal_friend();
});