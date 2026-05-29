import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import cron from "node-cron";
import fs from "fs";
import path from "path";

// Load firebase-applet-config.json
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const appConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
};

const firebaseApp = initializeApp(appConfig);
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

interface PayoutResult {
  userId: string;
  fullName: string;
  position: string;
  salary: number;
  status: "PAID" | "ALREADY_PAID" | "FAILED";
  error?: string;
}

export async function runSalaryDistribution(): Promise<PayoutResult[]> {
  console.log("[Salary Service] Starting monthly position salaries distribution...");
  const results: PayoutResult[] = [];

  try {
    // 1. Fetch all users from Firestore
    const userSnapshot = await getDocs(collection(db, "users"));
    const users: any[] = [];
    userSnapshot.forEach((d) => {
      users.push({ id: d.id, ...d.data() });
    });

    console.log(`[Salary Service] Fetched ${users.length} users to evaluate.`);

    // 2. Build in-memory map & referral relations
    const userMap = new Map<string, any>();
    const childrenMap = new Map<string, string[]>(); // parentId -> childIds[]

    for (const user of users) {
      const userId = (user.phoneNumber || user.id || "").trim();
      if (!userId) continue;
      userMap.set(userId, user);

      const parentId = (user.invitedBy || "").trim();
      if (parentId) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(userId);
      }
    }

    // 3. Current year-month identifier (e.g., "2026-05")
    // Ethiopia is in East Africa Time (EAT), which is UTC + 3 hours
    const now = new Date();
    const utcTime = now.getTime();
    const eatTime = new Date(utcTime + 3 * 60 * 60 * 1000);
    const currentYearMonth = eatTime.toISOString().substring(0, 7); // "YYYY-MM"

    console.log(`[Salary Service] Processing payouts for month: ${currentYearMonth}`);

    // Helper to calculate team metrics for any user
    const getTeamMetrics = (userId: string) => {
      const level1Ids = (childrenMap.get(userId) || []).filter((cid) => {
        const u = userMap.get(cid);
        return u && u.status !== "inactive";
      });

      const level2Ids: string[] = [];
      for (const l1Id of level1Ids) {
        const grandchildren = childrenMap.get(l1Id) || [];
        for (const cid of grandchildren) {
          const u = userMap.get(cid);
          if (u && u.status !== "inactive") {
            level2Ids.push(cid);
          }
        }
      }

      const level3Ids: string[] = [];
      for (const l2Id of level2Ids) {
        const greatGrandchildren = childrenMap.get(l2Id) || [];
        for (const cid of greatGrandchildren) {
          const u = userMap.get(cid);
          if (u && u.status !== "inactive") {
            level3Ids.push(cid);
          }
        }
      }

      return {
        level1Count: level1Ids.length,
        totalTeamCount: level1Ids.length + level2Ids.length + level3Ids.length,
      };
    };

    // Helper to map metrics to POSITION_RULES
    const getQualifiedPosition = (level1: number, totalTeam: number) => {
      if (level1 >= 25 && totalTeam >= 7000) {
        return { position: "Company Partner", salary: 1300000 };
      }
      if (level1 >= 25 && totalTeam >= 3500) {
        return { position: "Marketing Director", salary: 600000 };
      }
      if (level1 >= 25 && totalTeam >= 1500) {
        return { position: "Regional Manager", salary: 250000 };
      }
      if (level1 >= 25 && totalTeam >= 500) {
        return { position: "Marketing Manager", salary: 120000 };
      }
      if (level1 >= 25 && totalTeam >= 150) {
        return { position: "Formal Supervisor", salary: 50000 };
      }
      if (level1 >= 25) {
        return { position: "Official Assistant", salary: 16000 };
      }
      if (level1 >= 15) {
        return { position: "Internship Assistant", salary: 8000 };
      }
      return null;
    };

    // 4. Iterate and distribute to eligible users
    for (const user of users) {
      const userId = (user.phoneNumber || user.id || "").trim();
      if (!userId) continue;

      const metrics = getTeamMetrics(userId);
      const qual = getQualifiedPosition(metrics.level1Count, metrics.totalTeamCount);

      if (!qual) {
        continue; // User doesn't qualify for any position salary
      }

      const payoutDocId = `${userId}_${currentYearMonth}`;
      const payoutDocRef = doc(db, "salary_payouts", payoutDocId);

      try {
        const payoutCheck = await getDoc(payoutDocRef);

        if (payoutCheck.exists()) {
          console.log(`[Salary Service] User ${userId} is already paid for ${currentYearMonth}.`);
          results.push({
            userId,
            fullName: user.fullName || "User",
            position: qual.position,
            salary: qual.salary,
            status: "ALREADY_PAID",
          });
          continue;
        }

        // Write payout and update balance
        console.log(`[Salary Service] Distributing salary for user ${userId} (${qual.position}) ...`);
        
        // 1. Create a payout record
        await setDoc(payoutDocRef, {
          userId,
          fullName: user.fullName || "User",
          position: qual.position,
          salaryAmount: qual.salary,
          timestamp: serverTimestamp(),
          month: currentYearMonth,
          level1Count: metrics.level1Count,
          totalTeamCount: metrics.totalTeamCount,
        });

        // 2. Increment user's income balance in users table
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          income: increment(qual.salary),
        });

        // 3. Add to bonuses collection
        await addDoc(collection(db, "bonuses"), {
          userId,
          amount: qual.salary,
          type: "salary_payout",
          label: `Monthly Salary: ${qual.position}`,
          timestamp: serverTimestamp(),
        });

        results.push({
          userId,
          fullName: user.fullName || "User",
          position: qual.position,
          salary: qual.salary,
          status: "PAID",
        });

        console.log(`[Salary Service] Successfully paid ${qual.salary} ETB to user ${userId}.`);
      } catch (err: any) {
        console.error(`[Salary Service] Error processing payout for user ${userId}:`, err);
        results.push({
          userId,
          fullName: user.fullName || "User",
          position: qual.position,
          salary: qual.salary,
          status: "FAILED",
          error: err?.message || String(err),
        });
      }
    }
  } catch (error: any) {
    console.error("[Salary Service] Fatal error during salary distribution:", error);
  }

  return results;
}

// Set up the scheduled CRON job
export function initializeSalaryScheduler() {
  console.log("[Salary Service] Initializing background cron job...");

  // Runs once a day at midnight (00:00) to check and pay newly qualified eligible users
  cron.schedule("0 0 * * *", async () => {
    console.log("[Salary Service] Cron Scheduler Triggered.");
    try {
      await runSalaryDistribution();
    } catch (err) {
      console.error("[Salary Service] Cron job execution failed:", err);
    }
  });

  console.log("[Salary Service] Background cron job successfully scheduled to run at 12:00 AM daily.");
}
