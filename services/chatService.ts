import { db } from "./firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { ChatMessage, ChatUser, ChatSession } from "../types";

// --- GET ALL USERS (DOCTORS) EXCEPT CURRENT USER ---
export const subscribeToUsers = (currentUid: string, onData: (users: ChatUser[]) => void) => {
    const q = query(collection(db, "users"));
    
    return onSnapshot(q, (snapshot) => {
        const users: ChatUser[] = [];
        snapshot.forEach((doc) => {
            const userData = doc.data() as ChatUser;
            if (userData.uid !== currentUid) {
                users.push(userData);
            }
        });
        onData(users);
    });
};

// --- GENERATE CHAT ID (ONE-ON-ONE) ---
export const getChatId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

// --- SUBSCRIBE TO MESSAGES IN A CHAT ---
export const subscribeToMessages = (chatId: string, onData: (msgs: ChatMessage[]) => void) => {
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
    try {
        const chatRef = doc(db, "chats", chatId);
        // Only update if it exists
        await updateDoc(chatRef, {
            "lastMessage.seen": true
        });
    } catch (e) {
        // Ignore error if doc doesn't exist yet or other issues
        console.warn("Could not mark as read", e);
    }
};

// --- SEND MESSAGE ---
export const sendMessage = async (chatId: string, senderId: string, text: string) => {
    if (!text.trim()) return;

    try {
        const chatRef = doc(db, "chats", chatId);
        const participants = chatId.split('_'); // Derive participants from ID

        // 1. Update Parent Chat Document (Metadata for notifications)
        await setDoc(chatRef, { 
            participants: participants,
            lastMessage: {
                text,
                senderId,
                timestamp: serverTimestamp(),
                seen: false // Reset seen status on new message
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