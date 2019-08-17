var http = require('http');
var fs = require('fs');
var _path=require('path');
var express = require('express');
//added request to make request to get json body
var request = require('request');
var _my_name = "prnc_002";
var mongoClient = require('mongodb').MongoClient;
var result=[];
var schedule=require('node-schedule');
var _my_ip = require('my-local-ip');
var db;
mongoClient.connect("mongodb://localhost:27017/MyDb", function(err,database){
	if(err){
		return console.log(err);
	}
	db=database;
	});
var app=express();
http.createServer(app).listen(3000);
console.log(_my_ip());
dlprogress=0;
c=0;
var paths=["/home/prince/file.deb"];
//download chunks function
function download_chunks(path,file_name){
	//$path denotes the path from where the file is to be downlaoded and $file_name the file to which the downloaded is to be saved
	var request=http.get("http://localhost:3000/file.deb",function(response){
	response.addListener('data',function(chunk){
		dlprogress+=chunk.length;
		file_name.write(chunk,enconding='binary');
		c+=1;

	});
	response.addListener('end',function(){
		console.log("total chunks"+c);
		file_name.end();
		console.log("file download completed at a server");
	});
	});

	return;
}

//receiving pings from other local pcs
function receive_pings(ip,name,_chance){
	console.log("recieved ping from"+ip);
	db.collection('active_friends',function(err,collection){
		collection.replaceOne({'ip':ip},{'ip':ip,'last_seen':+ new Date(),'chance':_chance},{upsert:true});
		add_friend(ip,name);
		if(err)
			console.log(err);
	});
}
//function to find and list all files on console
function list_files(path,filter){
	var files=fs.readdirSync(path);
    for(var i=0;i<files.length;i++){
        var filename=_path.join(path,files[i]);
        var stat = fs.lstatSync(filename);
      if (stat.isDirectory()){
            list_files(filename,filter); //recurse
        }
        else if (filename.indexOf(filter)>=0) {
        	result.push({'ip':'192.168.1.17','path':filename});
            console.log('-- found: ',filename);
        };
    };
    console.log(result);
    return result;
}
//function to add friend
function add_friend(ip,name){
	db.collection('friends',function(err,collection){
		collection.updateOne({'name':name},{'name':name,'ip':ip},{upsert:true});
		if(err)
			console.log(err);
		
	});
}
app.get('/friend_list',function(req,res){
		db.collection('friends',function(err,collection){
		collection.find().toArray(function(err,data){
			if (err)
				return console.log(err);
			console.log(data);
		//res.writeHead(200,{'Context-Type':'text/plain'});
		res.status(200).send(data);
		});
	});
});
app.get('/add_mutal_friend',function(req,res){
	db.collection('friends',function(err,collection){
		collection.find().toArray(function(err,data){
			if(err)
				return console.log(err);
			for(var i=0;i<data.length;i++){
				var _ip=data[i].ip;
				console.log(data[i].ip+"   ");
				http.get({hostname:_ip,port:3000,path:'/friend_list',agent:false},function(res,err){
					res.on("data",function(chunk){
						//console.log(JSON.parse(chunk));
						//parsing response to json
						chunk = JSON.parse(chunk);
						for (var j=0;j<chunk.length;j++){
							add_friend(chunk[j].ip,chunk[j].name);
							console.log("added");
						}
					});
					
				}).on("error",function(err){
						console.log(_ip+" is dead at the moment");
					});
		}
		});
	});
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("done");
});

//get all available files
app.get('/list_files',function(req,res){
	
	console.time('list');
	res.send(JSON.stringify(list_files('/home/prince/Downloads',req.query.filter.trim())));
	//res.end("listed on console");
	console.timeEnd('list');
	result=[];
});
app.get('/add_found_friends',function(req,res){
	db.collection('friends',function(err,collection){
		collection.find().toArray(function(err,data){
			if(err)
				return console.log(err);
			console.log(data[ip]);
		});
	});
});
app.get('/add_friend',function(req,res){
	var ip=req.query.ip;
	var name=req.query.name;
	add_friend(ip,name);
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("Added/Updated");
	
});
//store this ping detail in pings database for mongo. to get the last ping data
app.get('/receive_pings',function(req,res){
	var name = req.query.name;
	var ip=(req.connection.remoteAddress).substring(7,(req.connection.remoteAddress).length);
	receive_pings(ip,name,1);
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("Ping made");
});
app.get('/download',function(req,res){
	//params as file name to be saved as
	var file=__dirname+"/"+"fariyad.mp4";
	//creating a binary file with given name of 0 size
//	var downloadFile=fs.createWriteStream(fileName,{'flags':'a'});
	//calling download chunks function
///	download_chunks(paths[0],downloadFile);
	res.setHeader('Content-disposition', 'attachment; filename=' + "fariyad.mp4")
	var fileStream = fs.createReadStream(file)
	fileStream.pipe(res);
	//res.writeHead(200,{'Context-Type':'text/plain'});
	//rres.end("download done");
});
app.get('/search',function(req,res){
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("id="+req.query.id);
});
app.get('/*',function(req,res){
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("index page");
	//console.log(__dirname);
});
console.log("server running at port 3000");
console.log(__dirname);

//infinite pings to friends after 30sec interval.
//code in am_active.js file

var am_active = schedule.scheduleJob('*/5 * * * * *', function(){
  db.collection('friends',function(err,collection){
		collection.find().toArray(function(err,data){
			if(err)
				return console.log(err);
			for(var i=0;i<data.length;i++){
				var _ip=data[i].ip;
				var name=data[i].name;
				//finding last seen from active_friends collection
				db.collection('active_friends',function(_err,_collection){
					_collection.find({"ip":_ip}).toArray(function(_err,_data){
						//got last seen of this ip
						if(_data.length != 0){
							if((new Date() - _data[0].last_seen) > 30000 && _data[0].chance){
								//if the difference is greater than 30 sec
								http.get({hostname:_ip,port:3000,path:"/receive_pings?name="+_my_name ,agent:false},function(res,err){
									if(res.statusCode == 200){
										receive_pings(_ip,name,0);
									}
									res.on("data",function(chunk){
										console.log("sent ping"+_ip+" "+new Date());
									});
						
								}).on("error",function(err){
									console.log(_ip+" is dead at the moment"+new Date());
								});
							}
						}
						else{
							http.get({hostname:_ip,port:3000,path:"/receive_pings?name="+_my_name ,agent:false},function(res,err){
									if(res.statusCode == 200){
										receive_pings(_ip,name,0);
									}
									res.on("data",function(chunk){
										console.log("sent ping"+_ip);
									});
								}).on("error",function(err){
									console.log(_ip+" is dead at the moment")
								});
						}
					});
					
				});

		}
		});
	});
});