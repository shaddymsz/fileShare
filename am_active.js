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