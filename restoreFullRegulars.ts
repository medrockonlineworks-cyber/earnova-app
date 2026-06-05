import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Target JOB2 users (completed 10 daily tasks, high income, or similar indicators)
const job2Users = [
  "0942052839",
  "0918601773",
  "0966690632",
  "0964055632"
];

// Target JOB1 users (completed tasks or received commissions indicating active downline team work)
const job1Users = [
  "0934602064",
  "0946681916",
  "0957570828",
  "0967631915",
  "0926909039",
  "0921486068",
  "0914749209",
  "0913127129",
  "0903850000",
  "0912905930",
  "251786978816",
  "915721539"
];

async function runRestoration() {
  console.log("=== RUNNING FULL TARGETED REGULAR USER RESTORATION ===");

  // Restore JOB2
  for (const phone of job2Users) {
    const userRef = doc(db, "users", phone);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentLevel = data.currentLevel || "Intern";
      const currentContracts = data.signedContracts || [];
      const updatedContracts = Array.from(new Set([...currentContracts, "Intern", "JOB1", "JOB2"]));
      const name = data.fullName === "no-name" || !data.fullName ? `User ${phone}` : data.fullName;

      await updateDoc(userRef, {
        currentLevel: "JOB2",
        workDeposit: 10000,
        signedContracts: updatedContracts,
        fullName: name
      });
      console.log(`[RESTORED JOB2] ${phone} | Name: ${name} | Previous Level: ${currentLevel}`);
    } else {
      console.log(`[WARNING] User document for JOB2 not found: ${phone}`);
    }
  }

  // Restore JOB1
  for (const phone of job1Users) {
    const userRef = doc(db, "users", phone);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentLevel = data.currentLevel || "Intern";
      const currentContracts = data.signedContracts || [];
      const updatedContracts = Array.from(new Set([...currentContracts, "Intern", "JOB1"]));
      const name = data.fullName === "no-name" || !data.fullName ? `User ${phone}` : data.fullName;

      await updateDoc(userRef, {
        currentLevel: "JOB1",
        workDeposit: 4000,
        signedContracts: updatedContracts,
        fullName: name
      });
      console.log(`[RESTORED JOB1] ${phone} | Name: ${name} | Previous Level: ${currentLevel}`);
    } else {
      console.log(`[WARNING] User document for JOB1 not found: ${phone}`);
    }
  }

  // Ensure Admin User 0926193920 is fully complete
  const adminRef = doc(db, "users", "0926193920");
  const adminSnap = await getDoc(adminRef);
  if (adminSnap.exists()) {
    const data = adminSnap.data();
    await updateDoc(adminRef, {
      currentLevel: "JOB4",
      workDeposit: 60000,
      role: "admin",
      fullName: data.fullName || "Admin Office",
      signedContracts: Array.from(new Set([...(data.signedContracts || []), "Intern", "JOB1", "JOB2", "JOB3", "JOB4"]))
    });
    console.log(`[RESTORED ADMIN] 0926193920 updated to JOB4 with admin role.`);
  }

  console.log("=== RESTORATION PROCESS SUCCESSFULLY COMPLETED ===");
}

runRestoration().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
