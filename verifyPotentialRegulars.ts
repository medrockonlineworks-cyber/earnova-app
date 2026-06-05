import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function verifyPotential() {
  const usersSnap = await getDocs(collection(db, "users"));
  console.log(`=== ANALYZING ALL USERS WITH CRITERIA FOR HIGHER LEVEL ===`);
  
  usersSnap.forEach(docSnap => {
    const d = docSnap.data();
    const uid = docSnap.id;
    
    const signedContracts = d.signedContracts || [];
    const hasJobContract = signedContracts.some((c: string) => c.toUpperCase().includes("JOB"));
    const workDeposit = d.workDeposit || 0;
    const income = d.income || 0;
    const currentLevel = d.currentLevel || "none";
    const completedTasksCount = d.completedTaskIds?.length || 0;

    // Check if they have symptoms of being a regular user
    if (currentLevel.toUpperCase() === "INTERN" || currentLevel === "none") {
      if (workDeposit > 0 || hasJobContract || income > 150 || completedTasksCount > 5) {
        console.log(`POTENTIAL REGULAR USER ID: ${uid}`);
        console.log(`  Name: ${d.fullName}`);
        console.log(`  Current Level in Doc: ${d.currentLevel}`);
        console.log(`  Work Deposit: ${workDeposit}`);
        console.log(`  Income: ${income}`);
        console.log(`  Signed Contracts:`, JSON.stringify(signedContracts));
        console.log(`  Tasks Completed Count: ${completedTasksCount}`);
        console.log(`  Onboarding Claimed: ${d.onboardingClaimed}`);
      }
    }
  });
}

verifyPotential().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
