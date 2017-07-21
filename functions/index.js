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
