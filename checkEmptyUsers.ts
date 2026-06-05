import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkEmptyUsers() {
  const ids = [
    "0915511922", "0915721539", "0916448122", "0918601773", 
    "0927409744", "0928085221", "0934602064", "0946681916", 
    "0999547604", "917066950"
  ];
  
  console.log("Checking documents of these 10 users:");
  for (const id of ids) {
    const userRef = doc(db, "users", id);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      console.log(`User: ${id} -> Data:`, JSON.stringify(snap.data()));
    } else {
      console.log(`User: ${id} -> Does not exist!`);
    }
  }
}

checkEmptyUsers().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
