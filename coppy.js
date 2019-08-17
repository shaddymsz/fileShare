var http = require('http');
var fs = require('fs');
var _path=require('path');
var express = require('express');
//added request to make request to get json body
var request = require('request');
var db;
var mongoClient = require('mongodb').MongoClient;
var result=[];
mongoClient.connect("mongodb://localhost:27017/MyDb", function(err,database){
	if(err){
		return console.log(err);
	}
	db=database;
	});
var app=express();
var downloader = require('mt-downloader')
http.createServer(app).listen(3000);
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
function receive_pings(ip){
	console.log("recieved ping from"+ip);
	db.collection('active_friends',function(err,collection){
		collection.replaceOne({'ip':ip},{'ip':ip,'last_seen':+ new Date()},{upsert:true});
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
			for(var i=0;i<data.length;i++)
				console.log(data[i].ip+"   ");
				http.get(data[i].ip+"/friend_list",function(err,data){
					console.log(data);
					if(err)
						console.log();
				});
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
	db.collection('friends',function(err,collection){
		collection.replaceOne({'name':name},{'name':name,'ip':ip},{upsert:true});
		res.writeHead(200,{'Context-Type':'text/plain'});
		if(err){
			console.log(err);
			res.end("alrdy exist");
		}
		res.ernd("added");
	});
});
//store this ping detail in pings database for mongo. to get the last ping data
app.get('/receive_pings',function(req,res){
	receive_pings(req.connection.remoteAddress);
	res.writeHead(200,{'Context-Type':'text/plain'});
	res.end("Ping made");
});
app.get('/download',function(req,res){
	//params as file name to be saved as
	var file=__dirname+"/"+"file.deb";
	//creating a binary file with given name of 0 size
//	var downloadFile=fs.createWriteStream(fileName,{'flags':'a'});
	//calling download chunks function
///	download_chunks(paths[0],downloadFile);
	res.setHeader('Content-disposition', 'attachment; filename=' + "file.deb")
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