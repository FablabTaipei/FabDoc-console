const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const transactionPushSet = function(id){
	return function(current){
		if(current){
			if(typeof current == 'string') current = JSON.parse(current);
			if(current.indexOf(id) == -1) current.push(id);
			return current;
		}else return [id]; 
	};
};

exports.makeProjectNameIndex = functions.database.ref('/project/{pushId}')
	.onCreate(event => {
		let pushId = event.params.pushId;
		let data = event.data;
		const original = data.val();
		if(!isNaN(pushId) && isNaN(original)){	// pushId is Number, and data is not number

			let currentRef = data.ref;
			let rootRef = currentRef.root;

			rootRef.child("user/" + original.user_id + "/projects").transaction(transactionPushSet(original.id));

			rootRef.child("_projectValids").transaction(transactionPushSet(original.id));

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

