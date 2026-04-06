import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const CONFIG = {
    apiKey: "AIzaSyBYJ2pVoWJ5ednWOnnF2dOJ43MJvDi_8rw",
    projectId: "hadeth-7baf7",
};

const app = initializeApp(CONFIG);
const db = getFirestore(app);

async function check() {
    const id = "0RTvNLbPbOGMnUhskCOR";
    try {
        const snap = await getDoc(doc(db, 'hadiths', id));
        if (snap.exists()) {
            console.log("Document found!");
            console.log("Data:", JSON.stringify(snap.data(), null, 2));
        } else {
            console.log("Document NOT found");
        }
    } catch(e) { console.error(e) }
}
check();
