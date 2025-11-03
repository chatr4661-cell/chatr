import { useState, useEffect } from "react";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged, 
  signOut,
  ConfirmationResult
} from "firebase/auth";
import { auth, googleProvider } from "@/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, MessageCircle, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { CountryCodeSelector } from "@/components/CountryCodeSelector";

// Validation schemas
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format");

const FirebaseLogin = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Email auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  
  // Phone auth state
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneError, setPhoneError] = useState("");
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        navigate("/firebase-chat");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Setup reCAPTCHA for phone auth after component mounts
  useEffect(() => {
    // Wait for DOM to be ready
    const timer = setTimeout(() => {
      const container = document.getElementById('recaptcha-container');
      if (container && !recaptchaVerifier) {
        try {
          const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
              console.log('reCAPTCHA solved');
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
              setPhoneError('reCAPTCHA expired. Please try again.');
            }
          });
          setRecaptchaVerifier(verifier);
        } catch (error) {
          console.error('Failed to initialize reCAPTCHA:', error);
        }
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.log('Error clearing recaptcha:', e);
        }
      }
    };
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    // Validate inputs
    const emailValidation = emailSchema.safeParse(email);
    const passwordValidation = passwordSchema.safeParse(password);

    if (!emailValidation.success) {
      setEmailError(emailValidation.error.errors[0].message);
      return;
    }

    if (!passwordValidation.success) {
      setEmailError(passwordValidation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: "Account created!",
          description: `Welcome, ${result.user.email}`,
        });
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "Welcome back!",
          description: `Signed in as ${result.user.email}`,
        });
      }
      navigate("/firebase-chat");
    } catch (error: any) {
      let errorMessage = "Authentication failed";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "Email already in use. Try logging in instead.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address";
          break;
        case 'auth/user-not-found':
          errorMessage = "No account found. Please sign up.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password";
          break;
        case 'auth/weak-password':
          errorMessage = "Password is too weak. Use at least 6 characters.";
          break;
        default:
          errorMessage = error.message;
      }
      
      toast({
        title: authMode === 'signup' ? "Signup Failed" : "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setEmailError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");

    const fullPhone = `${countryCode}${phoneNumber}`;
    const phoneValidation = phoneSchema.safeParse(fullPhone);

    if (!phoneValidation.success) {
      setPhoneError(phoneValidation.error.errors[0].message);
      return;
    }

    if (!recaptchaVerifier) {
      setPhoneError("reCAPTCHA not initialized");
      return;
    }

    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      toast({
        title: "OTP Sent",
        description: "Check your phone for the verification code",
      });
    } catch (error: any) {
      let errorMessage = "Failed to send OTP";
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = "Invalid phone number format";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many attempts. Please try again later.";
          break;
        default:
          errorMessage = error.message;
      }
      
      toast({
        title: "Phone Authentication Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setPhoneError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmationResult) {
      setPhoneError("Please request OTP first");
      return;
    }

    if (!otp || otp.length !== 6) {
      setPhoneError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast({
        title: "Success!",
        description: "Phone number verified",
      });
      navigate("/firebase-chat");
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
      setPhoneError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setEmailError("");
    try {
      // Clear any previous auth state
      await signOut(auth).catch(() => {});
      
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result.user) {
        toast({
          title: "Welcome!",
          description: `Signed in as ${result.user.displayName || result.user.email}`,
        });
        navigate("/firebase-chat");
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      
      let errorMessage = "Failed to sign in with Google";
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = "Sign-in popup was closed. Please try again.";
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = "Another popup is already open. Please close it and try again.";
          break;
        case 'auth/popup-blocked':
          errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
          break;
        case 'auth/invalid-credential':
          errorMessage = "Google authentication is not properly configured. Please contact support.";
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = "An account already exists with this email using a different sign-in method.";
          break;
        default:
          errorMessage = error.message || "Failed to sign in with Google";
      }
      
      toast({
        title: "Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setEmailError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <div id="recaptcha-container"></div>
      
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Chatr+</CardTitle>
          <CardDescription>
            Fast, simple, and secure messaging platform
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!user ? (
            <>
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="email">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="phone">
                    <Phone className="w-4 h-4 mr-2" />
                    Phone
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email">
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    {emailError && (
                      <p className="text-sm text-destructive">{emailError}</p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Processing..." : authMode === 'login' ? "Sign In" : "Sign Up"}
                    </Button>

                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                      disabled={loading}
                    >
                      {authMode === 'login' 
                        ? "Don't have an account? Sign up" 
                        : "Already have an account? Sign in"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="phone">
                  {!confirmationResult ? (
                    <form onSubmit={handlePhoneAuth} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="flex gap-2">
                          <CountryCodeSelector
                            value={countryCode}
                            onChange={setCountryCode}
                          />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="9876543210"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                            disabled={loading}
                            className="flex-1"
                            required
                          />
                        </div>
                      </div>

                      {phoneError && (
                        <p className="text-sm text-destructive">{phoneError}</p>
                      )}

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? "Sending OTP..." : "Send OTP"}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleOtpVerification} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="otp">Enter OTP</Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          disabled={loading}
                          maxLength={6}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          OTP sent to {countryCode}{phoneNumber}
                        </p>
                      </div>

                      {phoneError && (
                        <p className="text-sm text-destructive">{phoneError}</p>
                      )}

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? "Verifying..." : "Verify OTP"}
                      </Button>

                      <Button
                        type="button"
                        variant="link"
                        className="w-full"
                        onClick={() => {
                          setConfirmationResult(null);
                          setOtp("");
                          setPhoneError("");
                        }}
                        disabled={loading}
                      >
                        Use different number
                      </Button>
                    </form>
                  )}
                </TabsContent>
              </Tabs>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                onClick={handleGoogleLogin}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-secondary rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.photoURL || ""} />
                  <AvatarFallback>
                    {user.displayName?.[0] || user.email?.[0] || user.phoneNumber?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">
                    {user.displayName || user.email || user.phoneNumber}
                  </p>
                  {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                  {user.phoneNumber && <p className="text-sm text-muted-foreground">{user.phoneNumber}</p>}
                </div>
              </div>
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FirebaseLogin;
