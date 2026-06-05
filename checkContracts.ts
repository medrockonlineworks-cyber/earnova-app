import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkContracts() {
  const usersSnap = await getDocs(collection(db, "users"));
  let found = 0;
  usersSnap.forEach(docSnap => {
    const data = docSnap.data();
    const signedContracts = data.signedContracts || [];
    const id = docSnap.id;
    
    const hasJobContract = signedContracts.some((c: string) => c.toUpperCase().includes("JOB"));
    if (hasJobContract) {
      found++;
      console.log(`User ID: ${id} | Name: ${data.fullName} | Contracts: ${JSON.stringify(signedContracts)} | Level: ${data.currentLevel}`);
    }
  });
  console.log(`Total users with JOB contract: ${found}`);
}

checkContracts().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
