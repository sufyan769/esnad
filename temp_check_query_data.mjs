import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, limit, getDocs } from "firebase/firestore";

const CONFIG = {
    apiKey: "AIzaSyBYJ2pVoWJ5ednWOnnF2dOJ43MJvDi_8rw",
    projectId: "hadeth-7baf7",
};

const app = initializeApp(CONFIG);
const db = getFirestore(app);

async function check() {
    const q2 = query(collection(db, 'hadiths'), where("id", "==", "2053"), limit(1));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
        console.log("Data for '2053':", JSON.stringify(snap2.docs[0].data(), null, 2));
    } else {
        console.log("NOT found by string id '2053'");
    }
}
check();
