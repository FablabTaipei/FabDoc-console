var stream = require('stream');
var admin = require("firebase-admin");
var utils = require('../utils');

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

	if(components && typeof components != "string") components = JSON.stringify(components);
	// if(image && typeof image == "string") image = JSON.parse(image);
	if(machines && typeof machines != "string") machines = JSON.stringify(machines);

	return (image? self.saveImage(image) : Promise.resolve())
		.then(function(res){
			// append machines	// Machines: id, name, description, commit_ids?
			// append commit
			var db = admin.database();
			var rootRef = db.ref();
			var commitRef = db.ref("commit");
			
			return new Promise(function(resolve, reject){
				var resData = {
					project_id: data.project_id,
					user_id: data.user_id,
					message: message,
					components: components,
					machines: machines,
					repos: repos,
					note: note,
					image_data: res? JSON.stringify(res) : ""
				};

				rootRef.child('_tableInfo/commit').transaction(transactionTableInfo,
					function(error, committed, snapshot) {
						let currentData = snapshot.val();
						let currentIndex = currentData._next;

						resData.id = currentIndex;
						
						commitRef.child(currentIndex.toString()).set(resData);
					}
				).then(function(){ resolve(resData); }).catch(function(err){ reject(err); });
			});
		})
		.catch(function(err){
			console.log(err);
		});

};

exports.updateCommit = function(id, data){	
	if(!id || isNaN(id)) return Promise.reject("id is invalid.");
	var self = this;
	var validProps = Object.keys(commitSample);
	var toUpdate = {};

	// handle the change image?
	// if(data.image)

	for(var p in data){
		if(validProps.indexOf(p) != -1) toUpdate[p] = data[p];
	}

	var db = admin.database();
	var lookupRef = db.ref("commit/" + id);

	return new Promise(function(resolve, reject){
		lookupRef.once("value")
			.then(function(snapshot) {
				if(snapshot.exists()){
					// do update
					lookupRef.update(toUpdate).then(function(){ resolve(); }, function(err){ reject(err); });
				}else{
					self.addCommit(data).then(function(result){ resolve(result); }, function(err){ reject(err); });
				}
			});
	});
};

exports.saveImage = function(imgArray){
	// filename, base64String, mediaType
	if(!Array.isArray(imgArray)) imgArray = [imgArray];
	
	var promises = imgArray.map(function(item){
		var token = utils.getToken();
		var filename = (new Date()).getTime() + "-" + item.filename;
		var base64String = item.base64String;
		var mediaType = item.mediaType || 'image/png';
		return new Promise(function(resolve, reject){
			var file = bucket.file(filename);
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
			.on('finish', function() { resolve( { bucket: bucket.name, encodeFilename: encodeURIComponent(file.name), token: token} ); });
		})
	});

	return new Promise(function(resolve, reject){
		Promise.all(promises).then(function(results){ resolve(results); }, function(err){ reject(err); });
	});
};

// =====================================
// For Add/Update/Get project ==============
// =====================================
exports.addProject = function(name, user_id, description, license){
	if(!user_id) return Promise.reject("user_id can not be empty");
	if(!name) return Promise.reject("name can not be empty");
	if(name.replace(/[^a-zA-Z0-9\-_]/, '') != name) return Promise.reject("name only contains numbers, english letters, dash, underline.");
	if(!isNaN(name)) return Promise.reject("name can not be a number.");

	var db = admin.database();
	var rootRef = db.ref();
	var projectRef = rootRef.child("project");
	
	return new Promise(function(resolve, reject){
		projectRef.child(name).once("value")
			.then(function(snapshot) {
				if(snapshot.exists()) reject("name has duplicated.");
				else{
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
				}
			}).catch(function(err){ reject(err); });
	});
};

// exports.updateProject

exports.getProjects = function(user_id){
	if(!user_id) return Promise.reject("user_id can not be empty");

	var db = admin.database();
	var userRef = db.ref("/user/" + user_id);
	var projectRef = db.ref("/project");

	return new Promise(function(resolve, reject){
		userRef.once("value").then(function(snapshot){
			if(!snapshot.exists()) reject("The user is not exist.");
			else{
				let results = [];
				const userval = snapshot.val();
				let projectList = JSON.parse( userval.projects || "[]" );
				Promise.all(
					projectList.map(function(p_id){ 
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
