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


// var b64string = /* whatever */;
// var buf = Buffer.from(b64string, 'base64'); // Ta-da


// Get Download URL from file uploaded with Cloud Functions for Firebase
// https://stackoverflow.com/a/43764656/2238770

// const UUID = require("uuid-v4");

// const fbId = "<YOUR APP ID>";
// const fbKeyFile = "./YOUR_AUTH_FIlE.json";
// const gcs = require('@google-cloud/storage')({keyFilename: fbKeyFile});
// const bucket = gcs.bucket(`${fbId}.appspot.com`);

// var upload = (localFile, remoteFile) => {

//   let uuid = UUID();

//   return bucket.upload(localFile, {
//         destination: remoteFile,
//         uploadType: "media",
//         metadata: {
//           metadata: {
//             contentType: 'image/png',
//             firebaseStorageDownloadTokens: uuid
//           }
//         }
//       })
//       .then((data) => {

//           let file = data[0];

//           return Promise.resolve("https://firebasestorage.googleapis.com/v0/b/" + bucket.name + "/o/" + encodeURIComponent(file.name) + "?alt=media&token=" + uuid);
//       });
// }

// upload(localPath, remotePath).then( downloadURL => {
// 	console.log(downloadURL);
// });



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
			var commitCountRef = db.ref("commit");
			// commitCountRef.transaction(function(currentCount) {
			// 	if(currentCount) currentCount++;
			// 	else currentCount = 1;

			// 	db.ref('commit/' + currentCount).set( /* blahblah... */);

			// 	return currentCount;
			// });
			return commitCountRef.push({
				project_id: data.project_id,
				user_id: data.user_id,
				message: message,
				components: components,
				machines: machines,
				repos: repos,
				note: note,
				image_data: res? JSON.stringify(res) : ""
			});
		})
		.catch(function(err){
			console.log(err);
		});

};

exports.saveImage = function(imgArray){
	// filename, base64String, mediaType
	if(!Array.isArray(imgArray)) imgArray = [imgArray];
	
	var promises = imgArray.map(function(item){
		var token = utils.getToken();
		var filename = item.filename;
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
