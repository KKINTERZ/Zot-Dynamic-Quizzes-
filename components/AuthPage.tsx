
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  Loader2, ArrowRight, User, GraduationCap, School, Check, AlertCircle, 
  Mail, Lock, Eye, EyeOff, Key, Camera, Upload, Send
} from 'lucide-react';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { syncUserToFirestore } from '../services/userService';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
}

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
    </g>
  </svg>
);

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'ROLE_SELECTION' | 'AUTH_FORM' | 'VERIFICATION_SENT' | 'FORGOT_PASSWORD' | 'FORGOT_PASSWORD_SENT'>('ROLE_SELECTION');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [mode, setMode] = useState<'SIGNIN' | 'SIGNUP'>('SIGNIN');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [name, setName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const themeColor = role === 'teacher' ? 'indigo' : 'green';

  const handleRoleSelect = (selectedRole: 'student' | 'teacher') => {
      setRole(selectedRole);
      setStep('AUTH_FORM');
      setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic Validation
    if (!email || !password) {
        setError("Please fill in all required fields.");
        setIsLoading(false);
        return;
    }

    if (mode === 'SIGNUP') {
        if (!name) {
             setError("Please enter your full name.");
             setIsLoading(false);
             return;
        }
        if (password !== repeatPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }
        // Teacher Validation Logic
        if (role === 'teacher') {
            if (teacherCode !== 'ZEDDY-TEACH' && teacherCode !== 'ZOT2025') {
                setError("Invalid Teacher Access Code. Authorization required.");
                setIsLoading(false);
                return;
            }
        }
    }

    try {
        if (mode === 'SIGNUP') {
            // Create User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update Profile with Name
            await updateProfile(user, { 
                displayName: name 
            });

            // SYNC TO FIRESTORE
            await syncUserToFirestore(user, { 
                name: name,
                photoFileName: photo?.name,
                role: role
            });

            // Send Verification Email
            await sendEmailVerification(user);
            
            // Sign out immediately so they have to login after verifying
            await signOut(auth);

            setStep('VERIFICATION_SENT');
        } else {
            // Sign In
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            if (!user.emailVerified) {
                // If not verified, sign out and show verification message
                await signOut(auth);
                setStep('VERIFICATION_SENT');
                return;
            }

            // SYNC TO FIRESTORE (Ensure user exists in DB even if added manually or old account)
            await syncUserToFirestore(user, { role: role });
            
            onLogin({
                uid: user.uid,
                name: user.displayName || email.split('@')[0],
                email: user.email || '',
                isGuest: false,
                role: role
            });
        }
    } catch (err: any) {
        console.error("Auth Error:", err);
        const errorCode = err.code;
        
        if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
            setError("Password or Email Incorrect");
        } else if (errorCode === 'auth/email-already-in-use') {
            setError("User already exists. Sign in?");
        } else if (errorCode === 'auth/weak-password') {
            setError("Password should be at least 6 characters.");
        } else {
            setError(err.message || "An error occurred. Please try again.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
          setError("Please enter your email address.");
          return;
      }
      setIsLoading(true);
      setError(null);
      try {
          await sendPasswordResetEmail(auth, email);
          setStep('FORGOT_PASSWORD_SENT');
      } catch (err: any) {
          console.error("Reset Password Error", err);
          if (err.code === 'auth/user-not-found') {
              setError("No user found with this email.");
          } else if (err.code === 'auth/invalid-email') {
              setError("Invalid email address.");
          } else {
              setError("Failed to send reset link. Try again.");
          }
      } finally {
          setIsLoading(false);
      }
  };

  const handleGuestAccess = () => {
      setIsLoading(true);
      setTimeout(() => {
          onLogin({
              name: "Guest Student",
              isGuest: true,
              role: 'student'
          });
      }, 800);
  };

  const handleGoogleLogin = async () => {
       setIsLoading(true);
       try {
           const provider = new GoogleAuthProvider();
           const result = await signInWithPopup(auth, provider);
           const user = result.user;
           
           // SYNC TO FIRESTORE
           await syncUserToFirestore(user, { role: role });
           
           onLogin({
               uid: user.uid,
               name: user.displayName || "Google User",
               email: user.email || "",
               isGuest: false,
               role: role
           });
       } catch (error: any) {
           console.error("Google Sign-In Error", error);
           if (error.code === 'auth/unauthorized-domain') {
               setError("Domain not authorized. Please add this domain to Firebase Console > Authentication > Settings > Authorized Domains.");
           } else {
               setError("Failed to sign in with Google. " + (error.message || ""));
           }
       } finally {
           setIsLoading(false);
       }
  };

  const switchToSignIn = () => {
      setMode('SIGNIN');
      setError(null);
  };

  const renderVerificationSent = () => (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Send className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Check Your Email</h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                  We have sent a verification email to <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>.
                  <br /><br />
                  Please check your inbox, verify your email address, and then log in to continue.
              </p>

              <button
                  onClick={() => {
                      setStep('AUTH_FORM');
                      setMode('SIGNIN');
                      setError(null);
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${role === 'teacher' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                  Return to Login
              </button>
          </div>
      </div>
  );

  const renderForgotPassword = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100 dark:border-gray-700">
             <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Key className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                 <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your email address and we'll send you a link to reset your password.</p>
             </div>

             <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <input 
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              placeholder="name@example.com"
                              required
                          />
                      </div>
                  </div>

                  {error && (
                      <div className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50 text-red-600">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{error}</span>
                      </div>
                  )}

                  <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg disabled:opacity-70"
                  >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get Reset Link"}
                  </button>
             </form>

             <button 
                onClick={() => {
                    setStep('AUTH_FORM');
                    setMode('SIGNIN');
                    setError(null);
                }}
                className="w-full mt-4 py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
             >
                 Back to Sign In
             </button>
        </div>
    </div>
  );

  const renderForgotPasswordSent = () => (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Check Your Email</h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                  We sent you a password change link to <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>.
              </p>

              <button
                  onClick={() => {
                      setStep('AUTH_FORM');
                      setMode('SIGNIN');
                      setError(null);
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all shadow-lg bg-green-600 hover:bg-green-700`}
              >
                  Sign In
              </button>
          </div>
      </div>
  );

  const renderRoleSelection = () => (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 animate-fade-in">
          <div className="text-center mb-10 max-w-4xl mx-auto">
              <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                      <img src="https://iili.io/ffg5o5Q.png" alt="ZOT Logo" className="w-20 h-20 object-contain" />
                  </div>
              </div>
              
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-2 leading-tight max-w-3xl mx-auto">
                  <span className="bg-gradient-to-r from-green-500 via-blue-600 to-green-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                      WELCOME TO ZOT DYNAMIC QUIZZES BY ZEDDY ONLINE TUITIONS
                  </span>
              </h1>
              
              <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm md:text-base">Select your role to continue</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
              <button 
                onClick={() => handleRoleSelect('student')}
                className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-green-500 transition-all hover:shadow-xl text-left"
              >
                  <div className="absolute top-4 right-4 p-2 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors text-green-600">
                      <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">I am a Student</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Access dynamic quizzes, track progress, and use the live AI tutor.</p>
              </button>

              <button 
                onClick={() => handleRoleSelect('teacher')}
                className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 transition-all hover:shadow-xl text-left"
              >
                  <div className="absolute top-4 right-4 p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-600">
                      <School className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">I am a Teacher</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Generate custom exam papers, marking keys, and manage resources.</p>
              </button>
          </div>
      </div>
  );

  const renderAuthForm = () => (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900 animate-fade-in">
      {/* Left Panel (Visual) */}
      <div className={`hidden md:flex md:w-1/2 bg-${themeColor}-600 items-center justify-center p-12 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 text-white max-w-md">
              <div className="mb-6 p-3 bg-white/20 backdrop-blur-sm w-fit rounded-xl">
                  {role === 'student' ? <GraduationCap className="w-10 h-10" /> : <School className="w-10 h-10" />}
              </div>
              <h2 className="text-4xl font-bold mb-6">
                  {role === 'student' ? 'Master Your Exams' : 'Empower Your Classroom'}
              </h2>
              <p className="text-lg text-white/90 leading-relaxed mb-8">
                  {role === 'student' 
                      ? 'Join thousands of Zambian students using AI to practice past papers, understand complex topics, and ace their finals.' 
                      : 'Create comprehensive assessment materials, marking keys, and lesson aids instantly with our AI tools.'}
              </p>
              
              <div className="flex items-center gap-2 text-sm font-medium bg-black/20 w-fit px-4 py-2 rounded-full">
                  <Check className="w-4 h-4" />
                  {role === 'student' ? 'ECZ Syllabus Aligned' : 'Automated Marking Keys'}
              </div>
          </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
          <button 
            onClick={() => setStep('ROLE_SELECTION')}
            className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center text-sm font-medium transition-colors z-10"
          >
              <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Change Role
          </button>

          <div className="w-full max-w-md my-10">
              <div className="text-center mb-8">
                  <h2 className={`text-3xl font-bold text-gray-900 dark:text-white mb-2`}>
                      {mode === 'SIGNIN' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                      {mode === 'SIGNIN' ? 'Enter your details to access your account.' : 'Get started with your free account today.'}
                  </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                  {mode === 'SIGNUP' && (
                      <>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                              <div className="relative">
                                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                  <input 
                                      type="text"
                                      value={name}
                                      onChange={(e) => setName(e.target.value)}
                                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none transition-all"
                                      style={{ '--tw-ring-color': `var(--${themeColor}-500)` } as React.CSSProperties} 
                                      placeholder="John Doe"
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Photo</label>
                              <div className="relative">
                                  <div className="flex items-center justify-center w-full">
                                      <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-200 dark:border-gray-700 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                              {photo ? (
                                                  <p className="text-sm text-green-600 font-medium truncate px-4">{photo.name}</p>
                                              ) : (
                                                  <div className="flex items-center gap-2 text-gray-500">
                                                      <Camera className="w-5 h-5" />
                                                      <span className="text-sm">Upload Photo</span>
                                                  </div>
                                              )}
                                          </div>
                                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                      </label>
                                  </div>
                              </div>
                          </div>
                      </>
                  )}

                  {/* Teacher Access Code Verification */}
                  {mode === 'SIGNUP' && role === 'teacher' && (
                      <div className="animate-fade-in">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Teacher Access Code <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                              <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                              <input 
                                  type="text"
                                  value={teacherCode}
                                  onChange={(e) => setTeacherCode(e.target.value)}
                                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                  placeholder="Enter authorization code"
                              />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-1">
                              Verification required for teacher accounts. Try: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">ZOT2025</span>
                          </p>
                      </div>
                  )}

                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <input 
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none transition-all"
                              placeholder="name@example.com"
                          />
                      </div>
                  </div>

                  <div>
                      <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                          {mode === 'SIGNIN' && (
                              <button 
                                type="button"
                                onClick={() => {
                                    setStep('FORGOT_PASSWORD');
                                    setError(null);
                                }}
                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                              >
                                  Forgot password?
                              </button>
                          )}
                      </div>
                      <div className="relative">
                          <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <input 
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none transition-all"
                              placeholder="••••••••"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                      </div>
                  </div>

                  {mode === 'SIGNUP' && (
                      <div className="animate-fade-in">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repeat Password</label>
                          <div className="relative">
                              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                              <input 
                                  type={showPassword ? "text" : "password"}
                                  value={repeatPassword}
                                  onChange={(e) => setRepeatPassword(e.target.value)}
                                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none transition-all"
                                  placeholder="••••••••"
                              />
                          </div>
                      </div>
                  )}

                  {error && (
                      <button 
                        type="button"
                        onClick={() => {
                            if(error === "User already exists. Sign in?") {
                                switchToSignIn();
                            }
                        }}
                        className={`flex items-center gap-2 text-sm text-left w-full bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50 ${error === "User already exists. Sign in?" ? "hover:bg-red-100 cursor-pointer" : "cursor-default"}`}
                      >
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                          <span className="text-red-600">{error}</span>
                      </button>
                  )}

                  <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed
                      ${role === 'teacher' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'}`}
                  >
                      {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                          <>
                              {mode === 'SIGNIN' ? 'Sign In' : 'Create Account'}
                              <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                      )}
                  </button>
              </form>

              <div className="mt-6">
                  <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                        </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                      <button 
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                          <GoogleIcon className="w-5 h-5 mr-2" />
                          Google
                      </button>

                      {role === 'student' ? (
                          <button 
                            type="button"
                            onClick={handleGuestAccess}
                            className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                              <User className="w-5 h-5 mr-2" />
                              Continue as Guest
                          </button>
                      ) : (
                          <div className="w-full text-center text-xs text-gray-400 flex items-center justify-center py-2.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                              Guest access is disabled for Teachers.
                          </div>
                      )}
                  </div>
              </div>

              <div className="mt-8 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                      {mode === 'SIGNIN' ? "Don't have an account? " : "Already have an account? "}
                      <button
                          onClick={() => {
                              setMode(mode === 'SIGNIN' ? 'SIGNUP' : 'SIGNIN');
                              setError(null);
                          }}
                          className={`font-bold transition-colors ${role === 'teacher' ? 'text-indigo-600 hover:text-indigo-500' : 'text-green-600 hover:text-green-500'}`}
                      >
                          {mode === 'SIGNIN' ? 'Sign up' : 'Sign in'}
                      </button>
                  </p>
              </div>
          </div>
      </div>
    </div>
  );

  if (step === 'VERIFICATION_SENT') {
      return renderVerificationSent();
  }

  if (step === 'FORGOT_PASSWORD') {
      return renderForgotPassword();
  }

  if (step === 'FORGOT_PASSWORD_SENT') {
      return renderForgotPasswordSent();
  }

  if (step === 'ROLE_SELECTION') {
      return renderRoleSelection();
  }

  return renderAuthForm();
};

export default AuthPage;
