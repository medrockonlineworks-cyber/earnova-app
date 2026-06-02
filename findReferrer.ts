import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findReferrer() {
  console.log("Searching for users with phone number variations of 15721539 in any field...");
  const snap = await getDocs(collection(db, 'users'));
  
  snap.forEach(docSnap => {
    const phone = docSnap.id;
    const data = docSnap.data();
    if (phone.includes('15721539') || (data.phoneNumber && data.phoneNumber.includes('15721539'))) {
      console.log(`Found: ${phone} -> Name: ${data.fullName}, phone: ${data.phoneNumber}`);
    }
  });
}

findReferrer()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
