var mongoClient = require('mongodb').MongoClient;
var fs = require('fs');
var _path=require('path');
var http = require('http');
var async = require('async');
var result=[];

mongoClient.connect("mongodb://localhost:27017/MyDb", function(err,database){
	if(err){
		return console.log(err);
	}
	db=database;
	setup=database.collection('setup');
	friends = database.collection('friends');
	active_friends = database.collection('active_friends');
	});

var time_gap = 20000;

//lame function lol

exports.download_chunks=function (path,file_name){
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
//encoder function link : https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function encodeRFC5987ValueChars(str) {
    return encodeURIComponent(str).
        // Note that although RFC3986 reserves "!", RFC5987 does not,
        // so we do not need to escape it
        replace(/['()]/g, escape). // i.e., %27 %28 %29
        replace(/\*/g, '%2A').
            // The following are not required for percent-encoding per RFC5987, 
            // so we can allow for a little better readability over the wire: |`^
            replace(/%(?:7C|60|5E)/g, unescape);
}

//function to return all path from all ips 
//fucked my brains for this piece of shit
exports.search_all=function(query,callback){
	result=[];
	var parsed;
	var counter=0;
	if(query.indexOf('.')>0 || query.length<4 )
		callback(result,"Input a more corresponding search(without extension)");
	else{
	active_friends.find().toArray(function(err,data){
		if (data.length==0)
			callback([],"No Active Nodes");
		data.forEach(function(path,index){
			http.get({hostname:path.ip,port:3000,path:'/list_files?filter='+encodeRFC5987ValueChars(query),agent:false},function(res){
				res.on("data",function(chunk){
					parsed=JSON.parse(chunk);
					counter++;
					result=result.concat(parsed);
					//result.push(parsed);
					if(counter==data.length){
						console.log(result);
						callback(result,"");
					}
				}).on("error",function(err){
						console.log(path.ip+" is dead at the moment to list files on it");
					});
				});		
				
		
		});
	});
	}
}
//receiving pings from other local pcs
exports.receive_pings=function (ip,name,_chance){
	active_friends.replaceOne({'ip':ip},{'ip':ip,'last_seen':+ Date.now()},{upsert:true});
	this.add_friend(ip,name,_chance);
}
//active_friends json response
exports.update_active_friends=function (){
	active_friends.find().toArray(function(_err,_data){
		for (i=0;i<_data.length;i++){
			if((Date.now() - _data[i].last_seen) > time_gap){
				active_friends.deleteOne({"ip":_data[i].ip});
				}
			}
		});		
}

//video export

exports.add_mutal_friend=function (){
	friends.find().toArray(function(err,data){
			if(err)
				return console.log(err);
			for(var i=0;i<data.length;i++){
				var _ip=data[i].ip;
				http.get({hostname:_ip,port:3000,path:'/friend_list',agent:false},function(res,err){
					res.on("data",function(chunk){
						//parsing response to json
						chunk = JSON.parse(chunk);
						setup.find().toArray(function(er,_dt){
							_my_name=_dt[0].name;
							for (var j=0;j<chunk.length;j++){
							if(chunk[j].name != _my_name){
								var temp=chunk[j];
								friends.find({"name":temp.name}).toArray(function(err,_data){
									//console.log(temp.time);
									//recheck here
									if(_data==0 || temp.time>_data[0].time ){
										friends.updateOne({'name':temp.name},{'name':temp.name,'ip':temp.ip,'chance':1,'time':Date.now()},{upsert:true});
										if(err)
											console.log(err);
//										this.add_friend(temp.ip,temp.name,1);
										console.log("mutal friend added");
									}
								});
							}
							}
						});
					});
					
				}).on("error",function(err){
						console.log(_ip+" is dead at the moment to add mutual friends");
					});
			}
		});
}
function search_files(result,filter,path,_ip){
	//if(fs.exits(path)){
		var files=fs.readdirSync(path);
	    for(var i=0;i<files.length;i++){
	       	var filename=_path.join(path,files[i]);
	       	var stat = fs.lstatSync(filename);
	    	//recurse here
	    	if (stat.isDirectory()){
	        	search_files(result,filter,filename,_ip); //recurse
	       	}
	       	if ((filename.split("/")[filename.split("/").length-1]).toLowerCase().indexOf(filter.toLowerCase())>=0 && !stat.isDirectory()) {
	       		result.push({'ip':_ip,'path':filename});
	       	};
	    }
	//}
}
//function to find and list all files on console
exports.list_files=function files(filter,callback){
	result=[];
	filter=decodeURIComponent(filter);
	setup.find().toArray(function(err,data){
		data[0].path.forEach(function(path,index){
			search_files(result,filter,path,data[0].my_ip);
    	});
	callback(result,err) ;
	});
	
}
//function to add friend
exports.add_friend=function (ip,name,chance){
	db.collection('friends',function(err,collection){
		collection.updateOne({'name':name},{'name':name,'ip':ip,'chance':chance,'time':Date.now()},{upsert:true});
		if(err)
			console.log(err);
		
	});
}
//function to update ip
exports.update_ip=function(old_ip,new_ip){
	db.collection('friends',function(err,collection){
		collection.updateOne({'ip':old_ip},{$set:{'ip':new_ip}});
		if(err)
			console.log(err);
	});
}
//to update my own setup ip 
exports.update_setup_ip=function(old_ip,new_ip){
	db.collection('setup',function(err,coln){
		coln.updateOne({'my_ip':old_ip},{$set:{'my_ip':new_ip}});
		if(err)
			console.log(err);
	});
}
//update ip on active nodes
exports.update_ip_active_nodes=function(old_ip,new_ip,callback){
	var counter=0;
	active_friends.find().toArray(function(err,data){
		if (data.length==0)
			callback("No Active Nodes");
		data.forEach(function(path,_index){
			http.get({hostname:path.ip,port:3000,path:'/receive_ip_update/'+old_ip+'/'+new_ip,agent:false},function(res){
				res.on("data",function(chunk){
					counter++;
					if(counter==data.length)
						callback("success");
				}).on("error",function(err){
						console.log(path.ip+" is dead at the moment to update ip");
					});
				});		
				
		});
	});
}
