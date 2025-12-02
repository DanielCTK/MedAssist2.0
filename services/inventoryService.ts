import { 
    collection, 
    onSnapshot, 
    query, 
    orderBy,
    addDoc,
    doc,
    updateDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { InventoryItem } from "../types";

const COLLECTION_NAME = "inventory";

// Initial seed data if DB is empty (for demo purposes)
const SEED_DATA: Omit<InventoryItem, 'id'>[] = [
    { name: 'Panadol Extra', category: 'General', price: '150k', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80', stock: 24, badge: 'Pain' },
    { name: 'Insulin Pen', category: 'Device', price: '450k', img: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=300&q=80', stock: 12, badge: 'Diabetes' },
    { name: 'V.Rohto', category: 'Drops', price: '50k', img: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80', stock: 100, badge: 'Eye' },
    { name: 'Oximeter', category: 'Device', price: '220k', img: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=300&q=80', stock: 15, badge: 'Monitor' },
];

export const subscribeToInventory = (
    onData: (items: InventoryItem[]) => void,
    onError: (error: any) => void
) => {
    const q = query(collection(db, COLLECTION_NAME));
    
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as InventoryItem[];
        
        onData(items);
    }, onError);
};

export const updateStock = async (id: string, newStock: number) => {
    try {
        const itemRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(itemRef, { stock: newStock });
    } catch (error) {
        console.error("Error updating stock:", error);
        throw error;
    }
};

// Function to seed data (call manually if needed)
export const seedInventory = async () => {
    for (const item of SEED_DATA) {
        await addDoc(collection(db, COLLECTION_NAME), item);
    }
};
