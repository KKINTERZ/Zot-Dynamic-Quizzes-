
import { storage, db } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Uploads a profile photo to Firebase Storage and updates the user's Firestore document.
 * Path: user_uploads/{uid}/{filename}
 */
export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  try {
    const storagePath = `user_uploads/${userId}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    // Upload file
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    // Sync to Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        photoURL: downloadURL,
        photoFileName: file.name
    });
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    throw error;
  }
};

/**
 * Deletes a profile photo from Firebase Storage and clears the fields in Firestore.
 */
export const deleteProfilePhoto = async (userId: string, fileName: string) => {
  try {
    const storagePath = `user_uploads/${userId}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    // Delete from Storage
    try {
        await deleteObject(storageRef);
    } catch (e: any) {
        // If object not found, we still proceed to clear DB
        if (e.code !== 'storage/object-not-found') {
            throw e;
        }
    }
    
    // Sync to Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        photoURL: "",
        photoFileName: ""
    });
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    throw error;
  }
};

/**
 * Deletes all files in the user's storage folder (user_uploads/{userId}).
 */
export const deleteUserStorageData = async (userId: string) => {
  try {
    const storagePath = `user_uploads/${userId}`;
    const folderRef = ref(storage, storagePath);
    
    // List all files in the folder
    const listResult = await listAll(folderRef);
    
    // Delete all files
    const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
    await Promise.all(deletePromises);
    
  } catch (error) {
    console.warn("Error deleting user storage data (folder might be empty or missing):", error);
    // Proceed without throwing, as this is cleanup
  }
};
