const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Listens for new messages added to /commit/{Id}
exports.serializeData = functions.database.ref('/commit/{pushId}')
    .onCreate(event => {
		// You must return a Promise when performing asynchronous tasks inside a Functions such as
		// writing to the Firebase Realtime Database.

		// let pushId = event.params.pushId;
		// // Prevent call the method twice
		// if(isNaN(pushId)){
		// 	// Grab the current value of what was written to the Realtime Database.
		// 	let data = event.data;
		// 	let currentRef = data.ref;
		// 	let rootRef = currentRef.root;
		// 	const original = data.val();
		// 	return rootRef.child('/_tableInfo/commit').transaction(function(currentData){
			
		// 		let currentIndex = 1;
		// 		let currentCount = 0;
		// 		if(currentData != null){
		// 			currentIndex = currentData._next;
		// 			currentCount = currentData._count;
		// 		}
		// 		currentRef.parent.child(currentIndex.toString()).set(original);
		// 		currentRef.parent.child(pushId).remove();

		// 		return { _count: ++currentCount, _next: ++currentIndex };
		// 	});
		// }
		// return;

		return Promise.resolve();
    });

exports.makeProjectNameIndex = functions.database.ref('/project/{pushId}')
	.onCreate(event => {
		let pushId = event.params.pushId;
		let data = event.data;
		const original = data.val();
		if(!isNaN(pushId) && isNaN(original)){	// pushId is Number, and data is not number

			let currentRef = data.ref;
			let rootRef = currentRef.root;

			rootRef.child("user/" + original.user_id + "/projects").transaction(function(currentData){
				if(currentData){
					let list = JSON.parse(currentData);
					if(list.indexOf(original.id) == -1) list.push(original.id);
					return JSON.stringify(list);
				}else return "[" + original.id + "]"; 
			});

			return rootRef.child("_tableIndex/project/" + original.name).set(parseInt(pushId));
		}
	});

exports.makeUserNameIndex = functions.database.ref('/user/{pushId}')
	.onCreate(event => {
		let pushId = event.params.pushId;
		let data = event.data;
		const original = data.val();
		if(!isNaN(pushId) && isNaN(original)){	// pushId is Number, and data is not number
			return data.ref.root.child("_tableIndex/user/" + original.username).set(parseInt(pushId))
		}
	});

exports.addCommitTimeStamp = functions.database.ref('/project/{projectId}/commits/{commitId}')
	.onCreate(event => {
		let projectId = event.params.projectId;
		let commitId = event.params.commitId;
		let data = event.data;
		let original = data.val();

		original["created_at"] = (new Date()).toGMTString();

		return data.ref.update(original);
	});

