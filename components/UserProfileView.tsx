
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ArrowLeft, Save, Trash2, User, Mail, Shield, Camera, Edit2, Loader2, AlertTriangle, FileText, Upload } from 'lucide-react';
import { getUserProfile, updateUserProfile, deleteUserAccount, UserData } from '../services/userService';
import { uploadProfilePhoto, deleteProfilePhoto } from '../services/storageService';

interface UserProfileViewProps {
  user: UserProfile;
  onHome: () => void;
  onLogout: () => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ user, onHome, onLogout }) => {
  const [profileData, setProfileData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'NONE' | 'CONFIRM'>('NONE');

  useEffect(() => {
    if (user.uid && !user.isGuest) {
      loadData(user.uid);
    } else {
        setIsLoading(false);
    }
  }, [user]);

  const loadData = async (uid: string) => {
    try {
      const data = await getUserProfile(uid);
      if (data) {
        setProfileData(data);
        setNewName(data.name);
      } else {
        console.warn("Profile data not found or offline. Using local user data.");
        setProfileData({
            uid: uid,
            name: user.name,
            email: user.email || '',
            role: user.role,
            photoURL: '',
            photoFileName: ''
        } as UserData);
        setNewName(user.name);
      }
    } catch (e) {
      console.error("Failed to load profile", e);
      setProfileData({
            uid: uid,
            name: user.name,
            email: user.email || '',
            role: user.role
      } as UserData);
      setNewName(user.name);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profileData) return;
    setSaveLoading(true);
    try {
      await updateUserProfile(profileData.uid, { name: newName });
      setProfileData({ ...profileData, name: newName });
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to update profile", e);
      alert("Failed to update profile. Check your internet connection.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    setSaveLoading(true);
    try {
      await deleteUserAccount();
      onLogout();
    } catch (e) {
      console.error("Failed to delete account", e);
      alert("Failed to delete account. You may need to sign out and sign in again.");
      setSaveLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && profileData) {
        const file = e.target.files[0];
        // Basic validation
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("File is too large. Please select an image under 5MB.");
            return;
        }

        setSaveLoading(true);
        try {
            // If replacing, delete old one first (optional, but cleaner)
            if (profileData.photoFileName) {
                await deleteProfilePhoto(profileData.uid, profileData.photoFileName);
            }

            const url = await uploadProfilePhoto(profileData.uid, file);
            setProfileData({ ...profileData, photoURL: url, photoFileName: file.name });
        } catch (err) {
            console.error("Photo upload failed", err);
            alert("Failed to upload photo. Please try again.");
        } finally {
            setSaveLoading(false);
        }
    }
  };

  const handlePhotoDelete = async () => {
      if (!profileData || !profileData.photoFileName) return;
      if (!confirm("Are you sure you want to remove your profile photo?")) return;

      setSaveLoading(true);
      try {
          await deleteProfilePhoto(profileData.uid, profileData.photoFileName);
          setProfileData({ ...profileData, photoURL: "", photoFileName: "" });
      } catch (err) {
          console.error("Photo delete failed", err);
          alert("Failed to delete photo.");
      } finally {
          setSaveLoading(false);
      }
  };

  if (user.isGuest) {
      return (
          <div className="max-w-2xl mx-auto p-4 animate-fade-in text-center mt-20">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                  <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Guest Profile</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                      You are using a temporary guest account. Sign up to save your progress and customize your profile.
                  </p>
                  <button 
                    onClick={onLogout}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                      Sign In / Sign Up
                  </button>
                  <div className="mt-4">
                    <button onClick={onHome} className="text-gray-500 hover:underline">Back to Home</button>
                  </div>
              </div>
          </div>
      );
  }

  if (isLoading) {
      return (
          <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in p-4 sm:p-0 pb-20">
      <button 
        onClick={onHome}
        className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Home
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-green-500 to-emerald-600 relative">
              {/* Optional: Add cover photo upload feature later */}
          </div>
          
          <div className="px-8 pb-8">
              {/* Profile Picture */}
              <div className="relative -mt-16 mb-6 flex justify-between items-end">
                  <div className="relative group">
                      <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-700 flex items-center justify-center shadow-md overflow-hidden relative">
                          {profileData?.photoURL ? (
                              <img src={profileData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                              <User className="w-16 h-16 text-gray-400" />
                          )}
                          
                          {/* Upload Overlay when Editing */}
                          {isEditing && (
                              <label 
                                htmlFor="photo-upload"
                                className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                  {saveLoading ? (
                                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                                  ) : (
                                      <>
                                          <Camera className="w-8 h-8 text-white mb-1" />
                                          <span className="text-[10px] text-white font-medium">CHANGE</span>
                                      </>
                                  )}
                              </label>
                          )}
                      </div>

                      {/* Delete Button */}
                      {isEditing && profileData?.photoURL && !saveLoading && (
                          <button 
                            onClick={handlePhotoDelete}
                            className="absolute bottom-0 right-0 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-transform transform hover:scale-110"
                            title="Remove Photo"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      )}

                      {/* Hidden File Input */}
                      <input 
                          type="file" 
                          id="photo-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={!isEditing || saveLoading}
                      />
                  </div>
                  
                  {!isEditing && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                      >
                          <Edit2 className="w-4 h-4" />
                          Edit Profile
                      </button>
                  )}
              </div>

              {/* Edit Mode */}
              {isEditing ? (
                  <div className="space-y-6 animate-fade-in">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                          <input 
                              type="text" 
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                          />
                      </div>
                      
                      <div className="flex gap-4">
                          <button 
                            onClick={handleSave}
                            disabled={saveLoading}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-70"
                          >
                              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save Changes
                          </button>
                          <button 
                            onClick={() => { setIsEditing(false); setNewName(profileData?.name || ''); }}
                            disabled={saveLoading}
                            className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                              Cancel
                          </button>
                      </div>
                  </div>
              ) : (
                  /* Display Mode */
                  <div className="space-y-6">
                      <div>
                          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profileData?.name}</h1>
                          <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                              <Mail className="w-4 h-4" />
                              {profileData?.email}
                          </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Role</span>
                              <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
                                  <Shield className="w-4 h-4 text-green-600" />
                                  <span className="capitalize">{profileData?.role}</span>
                              </div>
                          </div>

                          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Photo File Name</span>
                              <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
                                  <FileText className="w-4 h-4 text-blue-500" />
                                  <span className="truncate">{profileData?.photoFileName || "No file uploaded"}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Delete Account Section */}
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                  {deleteStep === 'NONE' ? (
                      <button 
                        onClick={() => setDeleteStep('CONFIRM')}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                      >
                          <Trash2 className="w-4 h-4" />
                          Delete Account
                      </button>
                  ) : (
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50 animate-fade-in">
                          <div className="flex items-start gap-3 mb-4">
                              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                              <div>
                                  <h4 className="font-bold text-red-800 dark:text-red-200">Are you sure?</h4>
                                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                      This action cannot be undone. All your quiz history and personal data will be permanently deleted.
                                  </p>
                              </div>
                          </div>
                          <div className="flex gap-3">
                              <button 
                                onClick={handleDelete}
                                disabled={saveLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold flex items-center gap-2"
                              >
                                  {saveLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                  Confirm Delete
                              </button>
                              <button 
                                onClick={() => setDeleteStep('NONE')}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                              >
                                  Cancel
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default UserProfileView;
