import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkSpecificUser() {
  const userRef = doc(db, "users", "0913127129");
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    console.log("User 0913127129 Profile:", JSON.stringify(snap.data()));
  } else {
    console.log("User 0913127129 Profile does not exist!");
  }
}

checkSpecificUser().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
