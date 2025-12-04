import { db } from "./firebase";
import { collection, addDoc, updateDoc, onSnapshot, doc } from "firebase/firestore";
import { InventoryItem } from "../types";

const COLLECTION_NAME = "inventory";

// Expanded seed data for a rich initial experience
// ADDED 'export' KEYWORD HERE TO FIX THE CRASH
export const SEED_DATA: Omit<InventoryItem, 'id'>[] = [
    { name: 'Panadol Extra', category: 'General', price: '150k', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80', stock: 120, badge: 'Pain Relief' },
    { name: 'Insulin Pen', category: 'Device', price: '450k', img: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=300&q=80', stock: 15, badge: 'Diabetes' },
    { name: 'V.Rohto', category: 'Drops', price: '50k', img: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80', stock: 85, badge: 'Eye Care' },
    { name: 'Oximeter Pulse', category: 'Device', price: '220k', img: 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=300&q=80', stock: 30, badge: 'Monitoring' },
    { name: 'N95 Face Mask', category: 'Protection', price: '25k', img: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=300&q=80', stock: 500, badge: 'PPE' },
    { name: 'Amoxicillin 500mg', category: 'General', price: '80k', img: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=300&q=80', stock: 60, badge: 'Antibiotic' },
    { name: 'Digital Thermometer', category: 'Device', price: '120k', img: 'https://images.unsplash.com/photo-1584036561566-b93744118bf3?auto=format&fit=crop&w=300&q=80', stock: 45, badge: 'Diagnostic' },
    { name: 'Sterile Bandages', category: 'General', price: '15k', img: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=300&q=80', stock: 200, badge: 'First Aid' },
    { name: 'Hand Sanitizer', category: 'Protection', price: '45k', img: 'https://images.unsplash.com/photo-1584483766114-2cea6fac257d?auto=format&fit=crop&w=300&q=80', stock: 150, badge: 'Hygiene' },
    { name: 'BP Monitor', category: 'Device', price: '850k', img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=300&q=80', stock: 10, badge: 'Cardio' },
    { name: 'Vitamin C 1000mg', category: 'General', price: '60k', img: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=300&q=80', stock: 90, badge: 'Supplement' },
    { name: 'Surgical Gloves', category: 'Protection', price: '80k', img: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=300&q=80', stock: 300, badge: 'Latex Free' },
    { name: 'Stethoscope', category: 'Device', price: '1200k', img: 'https://images.unsplash.com/photo-1576091160550-2187d80a18f7?auto=format&fit=crop&w=300&q=80', stock: 5, badge: 'Professional' },
    { name: 'Saline Solution', category: 'Drops', price: '20k', img: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=300&q=80', stock: 100, badge: 'Sterile' },
    { name: 'Antiseptic Cream', category: 'General', price: '35k', img: 'https://images.unsplash.com/photo-1624454002302-36b824d7bd0a?auto=format&fit=crop&w=300&q=80', stock: 75, badge: 'Topical' }
];

export const subscribeToInventory = (
    onData: (items: InventoryItem[]) => void,
    onError: (error: any) => void
) => {
    return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as InventoryItem[];
            
            onData(items);
        }, onError);
};

export const updateStock = async (id: string, newStock: number) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, id), { stock: newStock });
    } catch (error) {
        console.error("Error updating stock:", error);
        throw error;
    }
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), item);
    } catch (error) {
        console.error("Error adding item:", error);
        throw error;
    }
};

// Function to seed data
export const seedInventory = async () => {
    try {
        const promises = SEED_DATA.map(item => addDoc(collection(db, COLLECTION_NAME), item));
        await Promise.all(promises);
        console.log("Seeding complete");
    } catch (e) {
        console.error("Seeding failed", e);
    }
};