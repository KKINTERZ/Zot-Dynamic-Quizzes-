
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, writeBatch } from 'firebase/firestore';
import { QuizHistoryItem } from '../types';

const STUDENT_HISTORY_COLLECTION = 'quiz_history';
const TEACHER_HISTORY_COLLECTION = 'teacher_quiz_history';

// --- STUDENT HISTORY FUNCTIONS ---

/**
 * Saves a completed quiz result to the user's personal history collection in Firestore.
 */
export const saveQuizHistory = async (userId: string, item: QuizHistoryItem) => {
    try {
        await addDoc(collection(db, `users/${userId}/${STUDENT_HISTORY_COLLECTION}`), item);
    } catch (e) {
        console.error("Error saving quiz history to cloud", e);
        throw e;
    }
};

/**
 * Retrieves the quiz history for a specific user.
 */
export const getQuizHistory = async (userId: string): Promise<QuizHistoryItem[]> => {
    try {
        const q = query(
            collection(db, `users/${userId}/${STUDENT_HISTORY_COLLECTION}`),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            return { ...doc.data(), id: doc.id } as QuizHistoryItem;
        });
    } catch (e) {
        console.error("Error fetching user history", e);
        return [];
    }
};

/**
 * Clears all history for the user.
 */
export const clearUserQuizHistory = async (userId: string) => {
    try {
        const q = query(collection(db, `users/${userId}/${STUDENT_HISTORY_COLLECTION}`));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
            batch.delete(d.ref);
        });
        
        await batch.commit();
    } catch (e) {
        console.error("Error clearing history", e);
        throw e;
    }
};

// --- TEACHER HISTORY FUNCTIONS ---

/**
 * Saves a generated quiz to the teacher's history collection.
 */
export const saveTeacherHistory = async (userId: string, item: QuizHistoryItem) => {
    try {
        await addDoc(collection(db, `users/${userId}/${TEACHER_HISTORY_COLLECTION}`), item);
    } catch (e) {
        console.error("Error saving teacher history to cloud", e);
        throw e;
    }
};

/**
 * Retrieves the generated quiz history for a teacher.
 */
export const getTeacherHistory = async (userId: string): Promise<QuizHistoryItem[]> => {
    try {
        const q = query(
            collection(db, `users/${userId}/${TEACHER_HISTORY_COLLECTION}`),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            return { ...doc.data(), id: doc.id } as QuizHistoryItem;
        });
    } catch (e) {
        console.error("Error fetching teacher history", e);
        return [];
    }
};

/**
 * Clears all teacher generation history.
 */
export const clearTeacherHistory = async (userId: string) => {
    try {
        const q = query(collection(db, `users/${userId}/${TEACHER_HISTORY_COLLECTION}`));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
            batch.delete(d.ref);
        });
        
        await batch.commit();
    } catch (e) {
        console.error("Error clearing teacher history", e);
        throw e;
    }
};
