import { lazy } from 'react';

/**
 * PERFORMANCE: Lazy-loaded pages for code splitting
 * Only critical pages are loaded eagerly, everything else is loaded on-demand
 * This reduces initial bundle from ~5MB to ~200KB
 */

// ============================================
// PRELOAD CRITICAL ROUTES
// Preload commonly visited pages after initial load
// ============================================
export const preloadCriticalRoutes = () => {
  // Defer preloading to idle time
  const preload = () => {
    // Most commonly visited after login
    import('@/pages/Chat');
    import('@/pages/Calls');
    import('@/pages/Profile');
    import('@/pages/Home');
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preload, { timeout: 3000 });
  } else {
    setTimeout(preload, 1500);
  }
};

// ============================================
// CRITICAL PAGES (Keep eagerly loaded for instant navigation)
// These are imported directly in App.tsx
// ============================================
// - Index, Auth, Home, Chat, Calls, Profile

// ============================================
// LAZY LOADED PAGES
// ============================================

// Core Features
export const StarredMessages = lazy(() => import('@/pages/StarredMessages'));
export const Contacts = lazy(() => import('@/pages/Contacts'));
export const GlobalContacts = lazy(() => import('@/pages/GlobalContacts'));
export const ContactsPage = lazy(() => import('@/pages/ContactsPage'));
export const SmartInbox = lazy(() => import('@/pages/SmartInbox'));
export const Stories = lazy(() => import('@/pages/Stories'));
export const GeoDiscovery = lazy(() => import('@/pages/GeoDiscovery'));
export const CallHistory = lazy(() => import('@/pages/CallHistory'));

// Earning / Micro-Tasks
export const Earn = lazy(() => import('@/pages/Earn'));
export const EarnHistory = lazy(() => import('@/pages/EarnHistory'));
export const AdminMicroTasks = lazy(() => import('@/pages/admin/MicroTasks'));

// Business / Dhandha
export const Dhandha = lazy(() => import('@/pages/Dhandha'));

// Communities
export const Communities = lazy(() => import('@/pages/Communities'));
export const CreateCommunity = lazy(() => import('@/pages/CreateCommunity'));
export const Community = lazy(() => import('@/pages/Community'));
export const CommunitySpace = lazy(() => import('@/pages/CommunitySpace'));

// Health & Wellness
export const HealthHub = lazy(() => import('@/pages/HealthHub'));
export const CareAccess = lazy(() => import('@/pages/CareAccess'));
export const WellnessTracking = lazy(() => import('@/pages/WellnessTracking'));
export const HealthPassport = lazy(() => import('@/pages/HealthPassport'));
export const LabReports = lazy(() => import('@/pages/LabReports'));
export const MedicineReminders = lazy(() => import('@/pages/MedicineReminders'));
export const BMICalculator = lazy(() => import('@/pages/BMICalculator'));
export const NutritionTracker = lazy(() => import('@/pages/NutritionTracker'));
export const MentalHealth = lazy(() => import('@/pages/MentalHealth'));
export const HealthReminders = lazy(() => import('@/pages/HealthReminders'));
export const HealthRiskPredictions = lazy(() => import('@/pages/HealthRiskPredictions'));
export const SymptomCheckerPage = lazy(() => import('@/pages/SymptomCheckerPage'));
export const HealthWalletPage = lazy(() => import('@/pages/HealthWalletPage'));
export const TeleconsultationPage = lazy(() => import('@/pages/TeleconsultationPage'));
export const MedicationInteractionsPage = lazy(() => import('@/pages/MedicationInteractionsPage'));
export const HealthStreaksPage = lazy(() => import('@/pages/HealthStreaksPage'));
export const ChronicVitalsPage = lazy(() => import('@/pages/ChronicVitalsPage'));
export const WellnessCircles = lazy(() => import('@/pages/WellnessCircles'));
export const ExpertSessions = lazy(() => import('@/pages/ExpertSessions'));
export const AlliedHealthcare = lazy(() => import('@/pages/AlliedHealthcare'));
export const LocalHealthcare = lazy(() => import('@/pages/LocalHealthcare'));

// Care System
export const DoctorDetail = lazy(() => import('@/pages/care/DoctorDetail'));
export const AddFamilyMember = lazy(() => import('@/pages/care/AddFamilyMember'));
export const MyAppointments = lazy(() => import('@/pages/care/MyAppointments'));
export const MedicineHubPage = lazy(() => import('@/pages/care/MedicineHub'));
export const MedicineSubscribePage = lazy(() => import('@/pages/care/MedicineSubscribe'));
export const MedicineSubscriptionsPage = lazy(() => import('@/pages/care/MedicineSubscriptions'));
export const MedicineFamilyPage = lazy(() => import('@/pages/care/MedicineFamily'));
export const MedicineVitalsPage = lazy(() => import('@/pages/care/MedicineVitals'));
export const MedicinePrescriptionsPage = lazy(() => import('@/pages/care/MedicinePrescriptions'));
export const MedicineRemindersPage = lazy(() => import('@/pages/care/MedicineReminders'));
export const MedicineRewardsPage = lazy(() => import('@/pages/care/MedicineRewards'));

// Booking & Providers
export const BookingPage = lazy(() => import('@/pages/BookingPage'));
export const BookingTracking = lazy(() => import('@/pages/BookingTracking'));
export const ProviderPortal = lazy(() => import('@/pages/ProviderPortal'));
export const ProviderRegister = lazy(() => import('@/pages/ProviderRegister'));
export const ProviderDetails = lazy(() => import('@/pages/ProviderDetails'));
export const ProviderDashboard = lazy(() => import('@/pages/ProviderDashboard'));
export const DoctorOnboarding = lazy(() => import('@/pages/DoctorOnboarding'));

// AI Features
export const AIAgentsHub = lazy(() => import('@/pages/AIAgentsHub'));
export const AIAgentCreate = lazy(() => import('@/pages/AIAgentCreate'));
export const AIAgentChatNew = lazy(() => import('@/pages/AIAgentChatNew'));
export const AIAgents = lazy(() => import('@/pages/AIAgents'));
export const AIAgentChat = lazy(() => import('@/pages/AIAgentChat'));
export const AIAssistant = lazy(() => import('@/pages/AIAssistant'));
export const AIBrowser = lazy(() => import('@/pages/AIBrowser'));
export const AIBrowserHome = lazy(() => import('@/pages/AIBrowserHome'));
export const AIBrowserView = lazy(() => import('@/pages/AIBrowserView'));
export const AIChat = lazy(() => import('@/pages/AIChat'));
export const PrechuAI = lazy(() => import('@/pages/PrechuAI'));

// Marketplace & Services
export const Marketplace = lazy(() => import('@/pages/Marketplace'));
export const ServiceListing = lazy(() => import('@/pages/ServiceListing'));
export const HomeServices = lazy(() => import('@/pages/HomeServices'));
export const MarketplaceCheckout = lazy(() => import('@/pages/marketplace/MarketplaceCheckout'));
export const OrderSuccessPage = lazy(() => import('@/pages/marketplace/OrderSuccess'));

// Food & Deals
export const FoodOrdering = lazy(() => import('@/pages/FoodOrdering'));
export const LocalDeals = lazy(() => import('@/pages/LocalDeals'));
export const RestaurantDetail = lazy(() => import('@/pages/food/RestaurantDetail'));
export const FoodCheckout = lazy(() => import('@/pages/food/FoodCheckout'));
export const OrderTracking = lazy(() => import('@/pages/food/OrderTracking'));
export const OrderHistory = lazy(() => import('@/pages/food/OrderHistory'));

// Mini Apps & Games
export const MiniAppsStore = lazy(() => import('@/pages/MiniAppsStore'));
export const MiniApps = lazy(() => import('@/pages/MiniApps'));
export const AppStatistics = lazy(() => import('@/pages/AppStatistics'));
export const DeveloperPortal = lazy(() => import('@/pages/DeveloperPortal'));
export const ChatrGames = lazy(() => import('@/pages/ChatrGames'));
export const ChatrApp = lazy(() => import('@/pages/ChatrApp'));
export const ChatrOS = lazy(() => import('@/pages/ChatrOS'));
export const OSDetection = lazy(() => import('@/pages/OSDetection'));
export const Launcher = lazy(() => import('@/pages/Launcher'));

// Chatr Features
export const ChatrWorld = lazy(() => import('@/pages/ChatrWorld'));
export const ChatrHome = lazy(() => import('@/pages/ChatrHome'));
export const ChatrResults = lazy(() => import('@/pages/ChatrResults'));
export const ChatrStudio = lazy(() => import('@/pages/ChatrStudio'));
export const ChatrPoints = lazy(() => import('@/pages/ChatrPoints'));
export const RewardShop = lazy(() => import('@/pages/RewardShop'));
export const ChatrGrowth = lazy(() => import('@/pages/ChatrGrowth'));
export const ChatrTutors = lazy(() => import('@/pages/ChatrTutors'));
export const ChatrWallet = lazy(() => import('@/pages/ChatrWallet'));
export const ChatrPlus = lazy(() => import('@/pages/ChatrPlus'));
export const ChatrPlusSearch = lazy(() => import('@/pages/ChatrPlusSearch'));
export const ChatrPlusSubscribe = lazy(() => import('@/pages/ChatrPlusSubscribe'));
export const ChatrPlusServiceDetail = lazy(() => import('@/pages/ChatrPlusServiceDetail'));
export const ChatrPlusSellerRegistration = lazy(() => import('@/pages/ChatrPlusSellerRegistration'));
export const ChatrPlusSellerDashboard = lazy(() => import('@/pages/ChatrPlusSellerDashboard'));
export const ChatrPlusCategoryPage = lazy(() => import('@/pages/ChatrPlusCategoryPage'));
export const ChatrPlusWallet = lazy(() => import('@/pages/ChatrPlusWallet'));

// Social & Youth
export const YouthEngagement = lazy(() => import('@/pages/YouthEngagement'));
export const YouthFeed = lazy(() => import('@/pages/YouthFeed'));
export const FameCam = lazy(() => import('@/pages/FameCam'));
export const FameLeaderboard = lazy(() => import('@/pages/FameLeaderboard'));
export const Capture = lazy(() => import('@/pages/Capture'));
export const Referrals = lazy(() => import('@/pages/Referrals'));
export const AmbassadorProgram = lazy(() => import('@/pages/AmbassadorProgram'));

// Seller Portal
export const SellerPortal = lazy(() => import('@/pages/SellerPortal'));
export const SellerBookings = lazy(() => import('@/pages/SellerBookings'));
export const SellerServices = lazy(() => import('@/pages/SellerServices'));
export const SellerAnalytics = lazy(() => import('@/pages/SellerAnalytics'));
export const SellerMessages = lazy(() => import('@/pages/SellerMessages'));
export const SellerSettings = lazy(() => import('@/pages/SellerSettings'));
export const SellerReviews = lazy(() => import('@/pages/SellerReviews'));
export const SellerPayouts = lazy(() => import('@/pages/SellerPayouts'));
export const SellerSubscription = lazy(() => import('@/pages/SellerSubscription'));
export const SellerSettlements = lazy(() => import('@/pages/seller/SellerSettlements'));

// Business Portal
export const BusinessDashboard = lazy(() => import('@/pages/business/Dashboard'));
export const BusinessOnboarding = lazy(() => import('@/pages/business/Onboarding'));
export const BusinessInbox = lazy(() => import('@/pages/business/Inbox'));
export const CRMPage = lazy(() => import('@/pages/business/CRM'));
export const BusinessAnalytics = lazy(() => import('@/pages/business/Analytics'));
export const BusinessTeam = lazy(() => import('@/pages/business/Team'));
export const BusinessSettings = lazy(() => import('@/pages/business/Settings'));
export const BusinessCatalog = lazy(() => import('@/pages/business/Catalog'));
export const BusinessBroadcasts = lazy(() => import('@/pages/business/Broadcasts'));
export const BusinessGroups = lazy(() => import('@/pages/business/Groups'));

// Vendor Portal
export const VendorLogin = lazy(() => import('@/pages/vendor/VendorLogin'));
export const VendorRegister = lazy(() => import('@/pages/vendor/VendorRegister'));
export const VendorDashboard = lazy(() => import('@/pages/vendor/VendorDashboard'));
export const VendorSettings = lazy(() => import('@/pages/vendor/VendorSettings'));
export const RestaurantMenu = lazy(() => import('@/pages/vendor/restaurant/RestaurantMenu'));
export const RestaurantOrders = lazy(() => import('@/pages/vendor/restaurant/RestaurantOrders'));
export const DealsManagement = lazy(() => import('@/pages/vendor/deals/DealsManagement'));
export const DoctorAppointments = lazy(() => import('@/pages/vendor/healthcare/DoctorAppointments'));
export const DoctorPatients = lazy(() => import('@/pages/vendor/healthcare/DoctorPatients'));
export const DoctorAnalytics = lazy(() => import('@/pages/vendor/healthcare/DoctorAnalytics'));
export const DoctorAvailability = lazy(() => import('@/pages/vendor/healthcare/DoctorAvailability'));

// Provider Pages
export const ProviderAppointments = lazy(() => import('@/pages/provider/Appointments'));
export const ProviderServices = lazy(() => import('@/pages/provider/Services'));
export const ProviderPayments = lazy(() => import('@/pages/provider/Payments'));

// Admin Pages
export const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
export const AdminUsers = lazy(() => import('@/pages/admin/Users'));
export const AdminProviders = lazy(() => import('@/pages/admin/Providers'));
export const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'));
export const AdminPayments = lazy(() => import('@/pages/admin/Payments'));
export const AdminPoints = lazy(() => import('@/pages/admin/Points'));
export const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
export const AdminAnnouncements = lazy(() => import('@/pages/admin/Announcements'));
export const AdminDocuments = lazy(() => import('@/pages/admin/Documents'));
export const AdminDoctorApplications = lazy(() => import('@/pages/admin/DoctorApplications'));
export const FeatureBuilder = lazy(() => import('@/pages/admin/FeatureBuilder'));
export const SchemaManager = lazy(() => import('@/pages/admin/SchemaManager'));
export const KYCApprovals = lazy(() => import('@/pages/admin/KYCApprovals'));
export const BrandPartnerships = lazy(() => import('@/pages/admin/BrandPartnerships'));
export const AppApprovals = lazy(() => import('@/pages/admin/AppApprovals'));
export const OfficialAccountsManager = lazy(() => import('@/pages/admin/OfficialAccountsManager'));
export const BroadcastManager = lazy(() => import('@/pages/admin/BroadcastManager'));
export const PaymentVerification = lazy(() => import('@/pages/admin/PaymentVerification'));
export const ChatrWorldAdmin = lazy(() => import('@/pages/ChatrWorldAdmin'));

// Settings & Account
export const Account = lazy(() => import('@/pages/Account'));
export const Settings = lazy(() => import('@/pages/Settings'));
export const NotificationSettings = lazy(() => import('@/pages/NotificationSettings'));
export const Notifications = lazy(() => import('@/pages/Notifications'));
export const DeviceManagement = lazy(() => import('@/pages/DeviceManagement'));
export const StealthMode = lazy(() => import('@/pages/StealthMode'));
export const Privacy = lazy(() => import('@/pages/Privacy'));

// Utility Pages
export const Geofences = lazy(() => import('@/pages/Geofences'));
export const GeofenceHistory = lazy(() => import('@/pages/GeofenceHistory'));
export const QRPayment = lazy(() => import('@/pages/QRPayment'));
export const QRLogin = lazy(() => import('@/pages/QRLogin'));
export const EmergencyButton = lazy(() => import('@/pages/EmergencyButton'));
export const EmergencyServices = lazy(() => import('@/pages/EmergencyServices'));
export const BluetoothTest = lazy(() => import('@/pages/BluetoothTest'));
export const UniversalSearch = lazy(() => import('@/pages/UniversalSearch'));
export const UserSubscription = lazy(() => import('@/pages/UserSubscription'));
export const KYCVerificationPage = lazy(() => import('@/pages/KYCVerification'));
export const LocalJobs = lazy(() => import('@/pages/LocalJobs'));
export const JobDetail = lazy(() => import('@/pages/JobDetail'));
export const OfficialAccounts = lazy(() => import('@/pages/OfficialAccounts'));

// Static Pages
export const About = lazy(() => import('@/pages/About'));
export const Help = lazy(() => import('@/pages/Help'));
export const Contact = lazy(() => import('@/pages/Contact'));
export const Download = lazy(() => import('@/pages/Download'));
export const Install = lazy(() => import('@/pages/Install'));
export const Onboarding = lazy(() => import('@/pages/Onboarding'));
export const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
export const Terms = lazy(() => import('@/pages/Terms'));
export const Refund = lazy(() => import('@/pages/Refund'));
export const Disclaimer = lazy(() => import('@/pages/Disclaimer'));
export const JoinInvite = lazy(() => import('@/pages/JoinInvite'));
export const ChatrWeb = lazy(() => import('@/pages/ChatrWeb'));
export const NotFound = lazy(() => import('@/pages/NotFound'));

// Desktop Layout
export const DesktopChat = lazy(() => import('@/pages/desktop/DesktopChat'));
export const DesktopContacts = lazy(() => import('@/pages/desktop/DesktopContacts'));
export const DesktopCalls = lazy(() => import('@/pages/desktop/DesktopCalls'));

// Care Components
export const CarePathDetail = lazy(() => import('@/components/care/CarePathDetail'));
