import { db } from "./firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { ChatMessage, ChatUser, ChatSession } from "../types";

// --- GET ALL USERS (DOCTORS/PATIENTS) EXCEPT CURRENT USER ---
export const subscribeToUsers = (currentUid: string, onData: (users: ChatUser[]) => void) => {
    const q = query(collection(db, "users"));
    
    return onSnapshot(q, (snapshot) => {
        const users: ChatUser[] = [];
        snapshot.forEach((docSnapshot) => {
            const userData = docSnapshot.data() as ChatUser;
            // CRITICAL FIX: Always use docSnapshot.id as the uid to ensure consistency
            const userWithId = { ...userData, uid: docSnapshot.id };
            
            if (userWithId.uid !== currentUid) {
                users.push(userWithId);
            }
        });
        onData(users);
    });
};

// --- GENERATE CHAT ID (ONE-ON-ONE) ---
// Ensures consistent ID regardless of who initiates (A-B vs B-A)
export const getChatId = (uid1: string, uid2: string) => {
    if (!uid1 || !uid2) {
        console.error("Invalid UIDs for Chat ID generation:", uid1, uid2);
        return "invalid_chat";
    }
    // Trim to ensure no accidental whitespace breaks the sort order
    const u1 = uid1.trim();
    const u2 = uid2.trim();
    return u1 < u2 ? `${u1}_${u2}` : `${u2}_${u1}`;
};

// --- SUBSCRIBE TO MESSAGES IN A CHAT ---
export const subscribeToMessages = (chatId: string, onData: (msgs: ChatMessage[]) => void) => {
    if (!chatId || chatId === "invalid_chat") return () => {};

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ChatMessage[];
        onData(msgs);
    });
};

// --- SUBSCRIBE TO ACTIVE CHAT SESSIONS (FOR NOTIFICATIONS) ---
export const subscribeToActiveChats = (currentUid: string, onData: (chats: ChatSession[]) => void) => {
    // Find chats where the current user is a participant
    // Firestore requires an exact match in the array
    const q = query(collection(db, "chats"), where("participants", "array-contains", currentUid));

    return onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ChatSession[];
        onData(chats);
    });
};

// --- MARK CHAT AS READ ---
export const markChatAsRead = async (chatId: string) => {
    if (!chatId || chatId === "invalid_chat") return;
    try {
        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, {
            "lastMessage.seen": true
        });
    } catch (e) {
        // Ignore error if doc doesn't exist yet
    }
};

// --- SEND MESSAGE ---
export const sendMessage = async (chatId: string, senderId: string, text: string) => {
    if (!text.trim() || chatId === "invalid_chat") return;

    try {
        const chatRef = doc(db, "chats", chatId);
        // Ensure participants are derived strictly from the chat ID to fix any "undefined" legacy data
        const participants = chatId.split('_'); 

        // 1. Update Parent Chat Document (Metadata for notifications)
        // We explicitly set participants every time to auto-heal any broken chat documents
        await setDoc(chatRef, { 
            participants: participants,
            lastMessage: {
                text,
                senderId,
                timestamp: serverTimestamp(),
                seen: false 
            },
            updatedAt: serverTimestamp() 
        }, { merge: true });

        // 2. Add message to subcollection
        await addDoc(collection(db, "chats", chatId, "messages"), {
            text,
            senderId,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};