var stream = require('stream');
var admin = require("firebase-admin");
var utils = require('../utils');
var md5 = require('md5');

var serviceAccount = require("../config/serviceAccountKey.json");

var storage = require('@google-cloud/storage')({ keyFilename: "server/config/serviceAccountKey.json" });

var bucket = storage.bucket('fabdoc-beta.appspot.com');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fabdoc-beta.firebaseio.com"
});

var commitSample = {
	id: 1,
	project_id: 1,
	user_id: 1,
	message: "test",
	components: "[{\"name\":\"hook\",\"quantity\":2,\"point\":[23,25,100,200]},{\"name\":\"hamer\",\"quantity\":1,\"point\":[66,45,150,40]}]",
	machines: "[\"shit\",\"damn\"]",
	repos: "https://github.com/FablabTaipei/FabDoc-RPi-client",
	note: "test",
	image_data: "[{\"bucket\":\"fabdoc-beta.appspot.com\",\"encodeFilename\":\"1500647671589-flower.jpg\",\"token\":\"106dacc9710b7a4ab6dadacca541879a\"}]"
};

var transactionTableInfo = function(currentData){
	if(currentData === null) return { _count: 1, _next: 1 };
	else return { _count: currentData._count + 1, _next: currentData._next + 1 };
}

var _parse = JSON.parse;
JSON.parse = function(){
	var input = arguments[0];
	var res;
	try{
		res = _parse.apply(this, arguments);
	}catch(err){
		if(typeof input == 'string') return input;
		else throw err;
	}finally{
		return res;
	}
};

var _getImagePath = function(pid, cid, fname){
	fname = fname || ""
	return pid + "/" + cid + "-" + fname;
};

var _getImageUrl = function(image){
	return "https://firebasestorage.googleapis.com/v0/b/" + image.bucket + "/o/" + (image.encodeFilename || encodeURIComponent(image.filename) ) + "?alt=media&token=" + image.token;
};

// =====================================
// For Add/Update commit ===============
// =====================================
// data: 
// 	message {String}
//  components {Object|String}
//  machines {Array of Object| Array of integer}
//    each:
//		name {String}
// 		description {String}
//  repos {String}
//  note {String}
//  image {Object|String|Array}
//    each:
//      filename {String}
//		imageBase64String {String}
//		mediaType {String}
exports.addCommit = function(data){
	var self = this;
	var message = data.message || "",
		components = data.components || "",
		machines = data.machines || "",
		repos = data.repos || "",
		note = data.note || "",
		image = data.image || null;

	// if(components && typeof components != "string") components = JSON.stringify(components);
	// if(image && typeof image == "string") image = JSON.parse(image);
	// if(machines && typeof machines != "string") machines = JSON.stringify(machines);
	// if(repos && typeof repos != "string") repos = JSON.stringify(repos);

	var db = admin.database();
	var projectCommitRef = db.ref("project/" + data.project_id + "/commits");
	var newCommitRef = projectCommitRef.push();

	return (image? self.saveImage(image, data.project_id, newCommitRef.key) : Promise.resolve())
		.then(function(res){
			// append machines	// Machines: id, name, description, commit_ids?
			// append commit
			
			return new Promise(function(resolve, reject){
				var resData = {
					project_id: parseInt(data.project_id),
					user_id: data.user_id,
					message: message,
					components: components,
					machines: machines,
					repos: repos,
					note: note,
					publish: false,
					image_data: res || ""
				};

				resData.id = newCommitRef.key;

				newCommitRef.set(resData)
					.then(function(){ 
						if(resData.image_data)
							resData.imageUrls = resData.image_data.map(_getImageUrl);
						resolve(resData);
					})
					.catch(function(err){ reject(err); });
			});
		})
		.catch(function(err){
			console.log(err);
		});

};

exports.updateCommit = function(id, data){	
	// if(!id || isNaN(id)) return Promise.reject("id is invalid.");
	var self = this;
	var validProps = Object.keys(commitSample);
	var toUpdate = {};

	// handle the change image?
	// if(data.image)

	for(var p in data){
		if(validProps.indexOf(p) != -1) toUpdate[p] = data[p];
	}

	var db = admin.database();
	var projectCommitRef = db.ref("project/" + data.project_id + "/commits/" + id);
	// var lookupRef = db.ref("commit/" + id);

	return new Promise(function(resolve, reject){
		projectCommitRef.once("value")
			.then(function(snapshot) {
				if(snapshot.exists()){
					// do update
					return projectCommitRef.update(toUpdate);
				}else{
					return self.addCommit(data);
				}
			})
			.then(function(result){ resolve(result); })
			.catch(function(err){ reject(err); });
	});
};

// commits: Array of ID|commit_object
exports.pushCommits = function(project_id, commits){
	var ids;
	if(commits){
		ids = commits.map(function(com){
			if(typeof com == 'string') return com;
			else return com.id;
		});
	}

	var db = admin.database();
	var projectCommitRef = db.ref("project/" + project_id + "/commits/");
	var self = this;

	return new Promise(function(resolve, reject){
		if(ids && ids.length > 0){
			Promise.all(
				ids.map(function(id){
					projectCommitRef.child(id + "/publish").set(true)
				})
			)
			.then(function(){ resolve(); })
			.catch(function(err){ reject(err); });
		}else{
			// fetch all uncommits and make it publish
			projectCommitRef.orderByChild("publish").equalTo(false)
				.once("value", function(snapshot){
					if(snapshot.exists()){
						var collection = snapshot.val();
						resolve( self.pushCommits(project_id, Object.keys(collection)) );
					}else resolve();
				}).catch(function(err){ reject(err); });
		}
	});
};

exports.saveImage = function(imgArray, project_id, commit_id){
	// filename, base64String, mediaType
	if(!Array.isArray(imgArray)) imgArray = [imgArray];
	
	var promises = imgArray.map(function(item){
		var token = utils.getToken();
		// var filename = (new Date()).getTime() + "-" + item.filename;
		var filename = encodeURIComponent(item.filename);
		var base64String = item.base64String;
		var mediaType = item.mediaType || 'image/png';
		return new Promise(function(resolve, reject){
			var file = bucket.file( _getImagePath(project_id, commit_id, filename) );
			var bufferStream = new stream.PassThrough();
			bufferStream.end( Buffer.from(base64String, 'base64') );

			bufferStream.pipe(
				file.createWriteStream({
					metadata: {
						contentType: mediaType,
						metadata: { firebaseStorageDownloadTokens: token },
						firebaseStorageDownloadTokens: token
					},
					public: true,
					validation: "md5",
					resumable: false
				})
			)
			.on('error', function(err) { reject(err); })
			.on('finish', function() { resolve( { bucket: bucket.name, filename: file.name, token: token } ); });
		})
	});

	return new Promise(function(resolve, reject){
		Promise.all(promises).then(function(results){ resolve(results); }, function(err){ reject(err); });
	});
};

exports.removeImage = function(filepath){
	var file = bucket.file(filepath);
	return file.delete();	// Promise
};

exports.getCommits = function(project_id){
	if(!project_id) return Promise.reject("project_id can not be empty");

	var db = admin.database();
	var projectCommitRef = db.ref("project/" + project_id + "/commits");

	return new Promise(function(resolve, reject){
		projectCommitRef.once("value")
			.then(function(snapshot) {
				if(snapshot.exists()){
					var data = snapshot.val();
					resolve(
						Object.keys(data).reverse().map(function(key){
							var output = data[key];
							if(output.image_data && typeof output.image_data == 'string') output.image_data = JSON.parse(output.image_data);
							if(output.components && typeof output.components == 'string') output.components = JSON.parse(output.components);
							if(output.machines && typeof output.machines == 'string') output.machines = JSON.parse(output.machines);
							if(output.repos && typeof output.repos == 'string') output.repos = JSON.parse(output.repos);

							if(output.image_data) output.imageUrls = output.image_data.map(_getImageUrl);

							return output;
						})
					);
				}else resolve();
			})
			.catch(function(err){ reject(err); });
	});
}

exports.removeCommit = function(project_id, commit_id){
	var self = this;
	var db = admin.database();
	var projectCommitRef = db.ref("project/" + project_id + "/commits/" + commit_id);

	return new Promise(function(resolve, reject){
		var removeImages;
		projectCommitRef.once("value")
			.then(function(snapshot){
				if(snapshot.exists()){
					var data = snapshot.val();
					if(removeImages = data.image_data){
						if(typeof data.image_data == 'string') removeImages = JSON.parse(data.image_data);
					}
					return projectCommitRef.remove();
				}else reject("The commit not found");
			})
			.then(function(){
				return Promise.all((removeImages || []).map(function(perImg){
					return self.removeImage( perImg.encodeFilename? decodeURIComponent(perImg.encodeFilename) : perImg.filename );
				}));
			})
			.then(function(res){ resolve(res); })
			.catch(function(err){ reject(err); });
	});
};

// =====================================
// For Add/Update/Get project ==========
// =====================================
exports.addProject = function(name, user_id, description, license){
	if(!user_id) return Promise.reject("user_id can not be empty");
	if(!name || name.trim() == "") return Promise.reject("name can not be empty");
	// if(name.replace(/[^a-zA-Z0-9\-_]/, '') != name) return Promise.reject("name only contains numbers, english letters, dash, underline.");
	if(!isNaN(name)) return Promise.reject("name can not be a number.");

	name = name.trim();

	if(name.length > 255) return Promise.reject("name characters can not over than 255.");

	var db = admin.database();
	var rootRef = db.ref();
	var projectRef = rootRef.child("project");
	
	return new Promise(function(resolve, reject){
		// to add project.
		var resData = {
			name: name,
			user_id: user_id,
			description: description || "",
			License: license || ""
		};
		rootRef.child('/_tableInfo/project').transaction(transactionTableInfo, 
			function(error, committed, snapshot) {
				let currentData = snapshot.val();
				let currentIndex = currentData._next;
				
				resData.id = currentIndex;
				projectRef.child(currentIndex.toString()).set(resData);
			}
		).then(function(){ resolve(resData); }, function(err){ reject(err); });
	});
};

// exports.updateProject
exports.getAllProjects = function(index, length){
	var db = admin.database();
	var userRef = db.ref("/user");
	var projectValidsRef = db.ref("/_projectValids")
	var projectRef = db.ref("/project");

	index = (isNaN(index) || index == null)? 0 : parseInt(index);
	length = (isNaN(length) || length == null)? 10 : parseInt(length);

	return new Promise(function(resolve, reject){
		projectValidsRef.on("value", function(validsSnapshot){
			if(!validsSnapshot.exists()) reject("No more projects");
			else{
				let results = [];
				var valids = validsSnapshot.val();
				let limitProjects = valids.reverse().slice(index, index + length);
				Promise.all(
					limitProjects.map(function(p_id){ 
						return new Promise(function(res, rej){
							projectRef.child(p_id.toString()).once("value").then(function(projectShot){
								if(projectShot.exists()) results.push(projectShot.val());
								res();
							},function(err){rej(err);});
						});
					})
				).then(function(){ resolve(results); }).catch(function(err){ reject(err); });
			}
		});
	});	
}

exports.getUserProjects = function(user_id, index, length){
	if(!user_id) return Promise.reject("user_id can not be empty");

	var db = admin.database();
	var userRef = db.ref("/user/" + user_id);
	var projectRef = db.ref("/project");

	index = (isNaN(index) || index == null)? 0 : parseInt(index);
	length = (isNaN(length) || length == null)? 10 : parseInt(length);

	return new Promise(function(resolve, reject){
		userRef.once("value").then(function(snapshot){
			if(!snapshot.exists()) reject("The user is not exist.");
			else{
				let results = [];
				const userval = snapshot.val();
				let projectList = (userval.projects? userval.projects.slice() : []);
				let limitProjects = projectList.reverse().slice(index, index + length);
				Promise.all(
					limitProjects.map(function(p_id){ 
						return new Promise(function(res, rej){
							projectRef.child(p_id.toString()).once("value").then(function(projectShot){
								if(projectShot.exists()) results.push(projectShot.val());
								res();
							},function(err){rej(err);});
						});
					})
				).then(function(){ resolve(results); }).catch(function(err){ reject(err); });
			}
		}).catch(function(err){ reject(err); });
	});
};

// =====================================
// For find/create user ===============
// =====================================
exports.findUser = function(user, pass){
	var db = admin.database();
	var userIndexRef = db.ref("/_tableIndex/user/" + user);

	return new Promise(function(resolve, reject){
		userIndexRef.once("value", function(snapshot){
			if(!snapshot.exists()) reject("The user is not exist.");
			else{
				var id = snapshot.val();
				var userIdRef = db.ref("/user/" + id);

				userIdRef.once("value", function(details){
					if(!details.exists()) reject("The user is not exist.");
					else{
						var data = details.val();
						if(data.password == md5(pass)) resolve(data);
						else reject("Password is not match.");
					}
				}).catch(function(err){ reject(err); });
			}
		}).catch(function(err){ reject(err); });
	});
};

exports.addUser = function(user, pass, email){
	if(!user) return Promise.reject("username can not be empty");
	if(!pass) return Promise.reject("password can not be empty");
	if(!email) return Promise.reject("email can not be empty");
	if(user.replace(/[0-9]/,'') == "") return Promise.reject("username can not contain only numbers.");
	if(user.replace(/[^a-zA-Z0-9]/, '') != user) return Promise.reject("username only contains numbers, english letters.");
	
	var db = admin.database();
	var rootRef = db.ref();
	var userIndexRef = rootRef.child("/_tableIndex/user/" + user);
	var userRef = rootRef.child("user");
	
	return new Promise(function(resolve, reject){
		userIndexRef.once("value")
			.then(function(snapshot) {
				if(snapshot.exists()) reject("username has duplicated.");
				else{
					// to add user.
					var resData = {
						username: user,
						password: md5(pass),
						email: email,
						verified: true
					};
					rootRef.child('/_tableInfo/user').transaction(transactionTableInfo, 
						function(error, committed, snapshot) {
							let currentData = snapshot.val();
							let currentIndex = currentData._next;
							
							resData.id = currentIndex;
							userRef.child(currentIndex.toString()).set(resData);
						}
					).then(function(){ resolve(resData); }, function(err){ reject(err); });
				}
			}).catch(function(err){ reject(err); });
	});
};

