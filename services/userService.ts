
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import type { User } from 'firebase/auth';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  photoFileName?: string;
  photoURL?: string;
  role?: 'student' | 'teacher';
  createdAt?: any;
  lastLoginAt?: any;
}

/**
 * Syncs the authenticated user to Firestore.
 * Creates the document if it doesn't exist (Registration or First Login), otherwise updates lastLoginAt.
 * Suppresses errors to prevent blocking the login flow if Firestore is unreachable.
 */
export const syncUserToFirestore = async (user: User, additionalData?: { name?: string, photoFileName?: string, role?: string }) => {
  if (!user) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const timestamp = serverTimestamp();

    if (!userSnap.exists()) {
      // Create new user document
      // This handles the "Every time a user registers..." and "If a user is already registered but isn't in the database..." requirements.
      const userData: UserData = {
        uid: user.uid,
        name: additionalData?.name || user.displayName || "User",
        email: user.email || "",
        photoURL: user.photoURL || "",
        photoFileName: additionalData?.photoFileName || "",
        role: (additionalData?.role as any) || 'student',
        createdAt: timestamp,
        lastLoginAt: timestamp
      };
      await setDoc(userRef, userData);
    } else {
      // Update existing user
      await updateDoc(userRef, {
        lastLoginAt: timestamp
      });
    }
  } catch (error) {
    console.warn("Firestore sync failed (likely offline). Proceeding with Auth only.", error);
  }
};

/**
 * Fetches user profile data from Firestore.
 * Returns null if fetch fails or client is offline.
 */
export const getUserProfile = async (uid: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }
    return null;
  } catch (error: any) {
    // Handle offline/network errors gracefully
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.warn("Network offline: Using local user profile fallback.");
        return null;
    }
    console.error("Failed to fetch user profile:", error);
    return null;
  }
};

/**
 * Updates user profile data in Firestore.
 */
export const updateUserProfile = async (uid: string, data: Partial<UserData>) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, data);
  } catch (error) {
    console.error("Failed to update profile:", error);
    throw error;
  }
};

/**
 * Deletes the user account from Firestore and Authentication.
 */
export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");

  // 1. Try to Delete from Firestore (Best effort)
  try {
    const userRef = doc(db, "users", user.uid);
    await deleteDoc(userRef);
  } catch (error) {
    console.warn("Failed to delete user Firestore doc (continuing to Auth delete):", error);
  }

  // 2. Delete from Auth (Critical)
  await deleteUser(user);
};
