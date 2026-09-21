'use strict';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAK9WpeKAKNeBmNCv-IIn3_ICQtuifeUoM",
    authDomain: "merge-game-4ca92.firebaseapp.com",
    projectId: "merge-game-4ca92",
    storageBucket: "merge-game-4ca92.firebasestorage.app",
    messagingSenderId: "777141437539",
    appId: "1:777141437539:web:47275b67f5e199624a2456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.currentUser = null;

let authResolve = null;
let authPromise = new Promise((resolve) => {
    authResolve = resolve;
});

async function ensureAuth() {
    if (window.currentUser) return window.currentUser;
    return await authPromise;
}

window.loadUserDataFromFirestore = async () => {
    try {
        const user = await ensureAuth();
        if (!user) return null;

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (error) {
        console.error("データ読み込み失敗:", error);
    }
    return null;
};

window.saveUserDataToFirestore = async (data) => {
    try {
        const user = await ensureAuth();
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            ...data,
            updatedAt: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("データ保存失敗:", error);
    }
};

window.saveScoreToFirestore = async (score, mergeCount = 0, userName = null) => {
    try {
        const user = await ensureAuth();
        if (!user) return;

        const currentName = userName
            || localStorage.getItem('gameUserName')
            || user.displayName
            || user.userName
            || 'Guest';

        const scoresRef = collection(db, "scores");
        await addDoc(scoresRef, {
            uid: user.uid,
            userName: currentName,
            score: score,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("スコア保存失敗:", error);
    }
};

window.fetchLeaderboardFromFirestore = async function (limitCount = 20) {
    try {
        const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(limitCount));
        const querySnapshot = await getDocs(q);

        const leaderboard = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            leaderboard.push({
                userName: data.userName || 'Guest',
                score: data.score || 0,
                createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
            });
        });
        return leaderboard;
    } catch (error) {
        console.error("ランキングの取得に失敗しました:", error);
        return [];
    }
};

window.fetchMyLeaderboardFromFirestore = async function (uid, limitCount = 20) {
    try {
        const user = await ensureAuth();
        const targetUid = uid || (user ? user.uid : null);
        if (!targetUid) return [];

        const q = query(
            collection(db, "scores"),
            where("uid", "==", targetUid),
            orderBy("score", "desc"),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);

        const leaderboard = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateObj = data.createdAt ? data.createdAt.toDate() : new Date();

            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');

            leaderboard.push({
                dateStr: `${year}/${month}/${day}`,
                score: data.score || 0
            });
        });
        return leaderboard;
    } catch (error) {
        console.error("マイランキングの取得エラー:", error);
        return [];
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.currentUser = user;
        if (authResolve) {
            authResolve(user);
            authResolve = null;
        }
        window.dispatchEvent(new Event('firebase-ready'));
    } else {
        try {
            const cred = await signInAnonymously(auth);
            window.currentUser = cred.user;
            if (authResolve) {
                authResolve(cred.user);
                authResolve = null;
            }
            window.dispatchEvent(new Event('firebase-ready'));
        } catch (error) {
            console.error("ログイン失敗:", error);
            if (authResolve) {
                authResolve(null);
                authResolve = null;
            }
        }
    }
});
