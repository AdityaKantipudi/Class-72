import * as firebase from 'firebase'
require('@firebase/firestore')


var firebaseConfig = {
  apiKey: "AIzaSyBCRVeDwWg0zcimE3WKRE-1zray8PwqO9Q",
  authDomain: "wily-app-615c6.firebaseapp.com",
  databaseURL: "https://wily-app-615c6.firebaseio.com",
  projectId: "wily-app-615c6",
  storageBucket: "wily-app-615c6.appspot.com",
  messagingSenderId: "555129396572",
  appId: "1:555129396572:web:a56652e3872a5e27723599"
};

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  export default firebase.firestore();
