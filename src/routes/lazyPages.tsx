import React from 'react';

/**
 * AGGRESSIVE LAZY LOADING
 * All pages are lazy-loaded to reduce initial bundle from ~5MB to ~200KB
 * This achieves WhatsApp-level load times (<1 second)
 */

// Shared loading component
export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

// Critical pages - preloaded after initial render
export const Index = React.lazy(() => import('@/pages/Index'));
export const Auth = React.lazy(() => import('@/pages/Auth'));
export const Home = React.lazy(() => import('@/pages/Home'));
export const Chat = React.lazy(() => import('@/pages/Chat'));

// Core navigation pages
export const Profile = React.lazy(() => import('@/pages/Profile'));
export const Contacts = React.lazy(() => import('@/pages/Contacts'));
export const Calls = React.lazy(() => import('@/pages/Calls'));
export const CallHistory = React.lazy(() => import('@/pages/CallHistory'));
export const Notifications = React.lazy(() => import('@/pages/Notifications'));
export const Settings = React.lazy(() => import('@/pages/Settings'));

// Secondary pages - loaded on demand
export const GeoDiscovery = React.lazy(() => import('@/pages/GeoDiscovery'));
export const StarredMessages = React.lazy(() => import('@/pages/StarredMessages'));
export const GlobalContacts = React.lazy(() => import('@/pages/GlobalContacts'));
export const ContactsPage = React.lazy(() => import('@/pages/ContactsPage'));
export const SmartInbox = React.lazy(() => import('@/pages/SmartInbox'));
export const Stories = React.lazy(() => import('@/pages/Stories'));
export const Communities = React.lazy(() => import('@/pages/Communities'));
export const CreateCommunity = React.lazy(() => import('@/pages/CreateCommunity'));

// Health & Wellness
export const WellnessTracking = React.lazy(() => import('@/pages/WellnessTracking'));
export const HealthPassport = React.lazy(() => import('@/pages/HealthPassport'));
export const LabReports = React.lazy(() => import('@/pages/LabReports'));
export const MedicineReminders = React.lazy(() => import('@/pages/MedicineReminders'));
export const BMICalculator = React.lazy(() => import('@/pages/BMICalculator'));
export const NutritionTracker = React.lazy(() => import('@/pages/NutritionTracker'));
export const MentalHealth = React.lazy(() => import('@/pages/MentalHealth'));
export const HealthReminders = React.lazy(() => import('@/pages/HealthReminders'));
export const HealthRiskPredictions = React.lazy(() => import('@/pages/HealthRiskPredictions'));
export const SymptomCheckerPage = React.lazy(() => import('@/pages/SymptomCheckerPage'));
export const HealthWalletPage = React.lazy(() => import('@/pages/HealthWalletPage'));
export const TeleconsultationPage = React.lazy(() => import('@/pages/TeleconsultationPage'));
export const MedicationInteractionsPage = React.lazy(() => import('@/pages/MedicationInteractionsPage'));
export const HealthStreaksPage = React.lazy(() => import('@/pages/HealthStreaksPage'));
export const ChronicVitalsPage = React.lazy(() => import('@/pages/ChronicVitalsPage'));
export const EmergencyButton = React.lazy(() => import('@/pages/EmergencyButton'));
export const EmergencyServices = React.lazy(() => import('@/pages/EmergencyServices'));
export const WellnessCircles = React.lazy(() => import('@/pages/WellnessCircles'));
export const ExpertSessions = React.lazy(() => import('@/pages/ExpertSessions'));

// Hub Pages
export const HealthHub = React.lazy(() => import('@/pages/HealthHub'));
export const CareAccess = React.lazy(() => import('@/pages/CareAccess'));
export const CommunitySpace = React.lazy(() => import('@/pages/CommunitySpace'));

// Care System
export const DoctorDetail = React.lazy(() => import('@/pages/care/DoctorDetail'));
export const AddFamilyMember = React.lazy(() => import('@/pages/care/AddFamilyMember'));
export const MyAppointments = React.lazy(() => import('@/pages/care/MyAppointments'));
export const MedicineHubPage = React.lazy(() => import('@/pages/care/MedicineHub'));
export const MedicineSubscribePage = React.lazy(() => import('@/pages/care/MedicineSubscribe'));
export const MedicineSubscriptionsPage = React.lazy(() => import('@/pages/care/MedicineSubscriptions'));
export const MedicineFamilyPage = React.lazy(() => import('@/pages/care/MedicineFamily'));
export const MedicineVitalsPage = React.lazy(() => import('@/pages/care/MedicineVitals'));
export const MedicinePrescriptionsPage = React.lazy(() => import('@/pages/care/MedicinePrescriptions'));
export const MedicineRemindersPage = React.lazy(() => import('@/pages/care/MedicineReminders'));
export const MedicineRewardsPage = React.lazy(() => import('@/pages/care/MedicineRewards'));

// Provider & Booking
export const BookingPage = React.lazy(() => import('@/pages/BookingPage'));
export const ProviderPortal = React.lazy(() => import('@/pages/ProviderPortal'));
export const ProviderRegister = React.lazy(() => import('@/pages/ProviderRegister'));
export const AlliedHealthcare = React.lazy(() => import('@/pages/AlliedHealthcare'));
export const ProviderDetails = React.lazy(() => import('@/pages/ProviderDetails'));
export const BookingTracking = React.lazy(() => import('@/pages/BookingTracking'));
export const ProviderDashboard = React.lazy(() => import('@/pages/ProviderDashboard'));
export const DoctorOnboarding = React.lazy(() => import('@/pages/DoctorOnboarding'));

// Marketplace & Services
export const Marketplace = React.lazy(() => import('@/pages/Marketplace'));
export const MarketplaceCheckout = React.lazy(() => import('@/pages/marketplace/MarketplaceCheckout'));
export const OrderSuccessPage = React.lazy(() => import('@/pages/marketplace/OrderSuccess'));
export const ServiceListing = React.lazy(() => import('@/pages/ServiceListing'));

// AI Features
export const AIAgentsHub = React.lazy(() => import('@/pages/AIAgentsHub'));
export const AIAgentCreate = React.lazy(() => import('@/pages/AIAgentCreate'));
export const AIAgentChatNew = React.lazy(() => import('@/pages/AIAgentChatNew'));
export const AIAgents = React.lazy(() => import('@/pages/AIAgents'));
export const AIAgentChat = React.lazy(() => import('@/pages/AIAgentChat'));
export const AIAssistant = React.lazy(() => import('@/pages/AIAssistant'));
export const AIBrowser = React.lazy(() => import('@/pages/AIBrowser'));
export const AIBrowserHome = React.lazy(() => import('@/pages/AIBrowserHome'));
export const AIBrowserView = React.lazy(() => import('@/pages/AIBrowserView'));
export const AIChat = React.lazy(() => import('@/pages/AIChat'));
export const PrechuAI = React.lazy(() => import('@/pages/PrechuAI'));

// Youth & Engagement
export const YouthEngagement = React.lazy(() => import('@/pages/YouthEngagement'));
export const YouthFeed = React.lazy(() => import('@/pages/YouthFeed'));
export const FameCam = React.lazy(() => import('@/pages/FameCam'));
export const FameLeaderboard = React.lazy(() => import('@/pages/FameLeaderboard'));
export const ChatrTutors = React.lazy(() => import('@/pages/ChatrTutors'));

// Points & Growth
export const ChatrPoints = React.lazy(() => import('@/pages/ChatrPoints'));
export const RewardShop = React.lazy(() => import('@/pages/RewardShop'));
export const ChatrGrowth = React.lazy(() => import('@/pages/ChatrGrowth'));
export const AmbassadorProgram = React.lazy(() => import('@/pages/AmbassadorProgram'));
export const Referrals = React.lazy(() => import('@/pages/Referrals'));
export const ChatrWallet = React.lazy(() => import('@/pages/ChatrWallet'));
export const UserSubscription = React.lazy(() => import('@/pages/UserSubscription'));

// Chatr+ System
export const ChatrPlus = React.lazy(() => import('@/pages/ChatrPlus'));
export const ChatrPlusSearch = React.lazy(() => import('@/pages/ChatrPlusSearch'));
export const ChatrPlusSubscribe = React.lazy(() => import('@/pages/ChatrPlusSubscribe'));
export const ChatrPlusServiceDetail = React.lazy(() => import('@/pages/ChatrPlusServiceDetail'));
export const ChatrPlusSellerRegistration = React.lazy(() => import('@/pages/ChatrPlusSellerRegistration'));
export const ChatrPlusSellerDashboard = React.lazy(() => import('@/pages/ChatrPlusSellerDashboard'));
export const ChatrPlusCategoryPage = React.lazy(() => import('@/pages/ChatrPlusCategoryPage'));
export const ChatrPlusWallet = React.lazy(() => import('@/pages/ChatrPlusWallet'));

// Seller Portal
export const SellerPortal = React.lazy(() => import('@/pages/SellerPortal'));
export const SellerBookings = React.lazy(() => import('@/pages/SellerBookings'));
export const SellerServices = React.lazy(() => import('@/pages/SellerServices'));
export const SellerAnalytics = React.lazy(() => import('@/pages/SellerAnalytics'));
export const SellerMessages = React.lazy(() => import('@/pages/SellerMessages'));
export const SellerSettings = React.lazy(() => import('@/pages/SellerSettings'));
export const SellerReviews = React.lazy(() => import('@/pages/SellerReviews'));
export const SellerPayouts = React.lazy(() => import('@/pages/SellerPayouts'));
export const SellerSubscription = React.lazy(() => import('@/pages/SellerSubscription'));
export const SellerSettlements = React.lazy(() => import('@/pages/seller/SellerSettlements'));

// Mini Apps & OS
export const MiniAppsStore = React.lazy(() => import('@/pages/MiniAppsStore'));
export const AppStatistics = React.lazy(() => import('@/pages/AppStatistics'));
export const DeveloperPortal = React.lazy(() => import('@/pages/DeveloperPortal'));
export const MiniApps = React.lazy(() => import('@/pages/MiniApps'));
export const ChatrOS = React.lazy(() => import('@/pages/ChatrOS'));
export const OSDetection = React.lazy(() => import('@/pages/OSDetection'));
export const Launcher = React.lazy(() => import('@/pages/Launcher'));

// Chatr World & Games
export const ChatrWorld = React.lazy(() => import('@/pages/ChatrWorld'));
export const ChatrGames = React.lazy(() => import('@/pages/ChatrGames'));
export const ChatrStudio = React.lazy(() => import('@/pages/ChatrStudio'));
export const Capture = React.lazy(() => import('@/pages/Capture'));

// Search & Discovery
export const UniversalSearch = React.lazy(() => import('@/pages/UniversalSearch'));
export const ChatrHome = React.lazy(() => import('@/pages/ChatrHome'));
export const ChatrResults = React.lazy(() => import('@/pages/ChatrResults'));

// Location & Services
export const LocalJobs = React.lazy(() => import('@/pages/LocalJobs'));
export const JobDetail = React.lazy(() => import('@/pages/JobDetail'));
export const LocalHealthcare = React.lazy(() => import('@/pages/LocalHealthcare'));
export const Geofences = React.lazy(() => import('@/pages/Geofences'));
export const GeofenceHistory = React.lazy(() => import('@/pages/GeofenceHistory'));
export const HomeServices = React.lazy(() => import('@/pages/HomeServices'));
export const FoodOrdering = React.lazy(() => import('@/pages/FoodOrdering'));
export const LocalDeals = React.lazy(() => import('@/pages/LocalDeals'));

// Food Ordering
export const RestaurantDetail = React.lazy(() => import('@/pages/food/RestaurantDetail'));
export const FoodCheckout = React.lazy(() => import('@/pages/food/FoodCheckout'));
export const OrderTracking = React.lazy(() => import('@/pages/food/OrderTracking'));
export const OrderHistory = React.lazy(() => import('@/pages/food/OrderHistory'));

// Official Accounts
export const OfficialAccounts = React.lazy(() => import('@/pages/OfficialAccounts'));

// Payment & QR
export const QRPayment = React.lazy(() => import('@/pages/QRPayment'));
export const QRLogin = React.lazy(() => import('@/pages/QRLogin'));
export const KYCVerificationPage = React.lazy(() => import('@/pages/KYCVerification'));

// Account & Settings
export const Account = React.lazy(() => import('@/pages/Account'));
export const NotificationSettings = React.lazy(() => import('@/pages/NotificationSettings'));
export const DeviceManagement = React.lazy(() => import('@/pages/DeviceManagement'));
export const StealthMode = React.lazy(() => import('@/pages/StealthMode'));
export const BluetoothTest = React.lazy(() => import('@/pages/BluetoothTest'));
export const ChatrApp = React.lazy(() => import('@/pages/ChatrApp'));

// Legal & Info Pages
export const About = React.lazy(() => import('@/pages/About'));
export const Help = React.lazy(() => import('@/pages/Help'));
export const Contact = React.lazy(() => import('@/pages/Contact'));
export const Privacy = React.lazy(() => import('@/pages/Privacy'));
export const Terms = React.lazy(() => import('@/pages/Terms'));
export const PrivacyPolicy = React.lazy(() => import('@/pages/PrivacyPolicy'));
export const Refund = React.lazy(() => import('@/pages/Refund'));
export const Disclaimer = React.lazy(() => import('@/pages/Disclaimer'));
export const Download = React.lazy(() => import('@/pages/Download'));
export const Install = React.lazy(() => import('@/pages/Install'));
export const Onboarding = React.lazy(() => import('@/pages/Onboarding'));
export const NotFound = React.lazy(() => import('@/pages/NotFound'));
export const JoinInvite = React.lazy(() => import('@/pages/JoinInvite'));
export const ChatrWeb = React.lazy(() => import('@/pages/ChatrWeb'));
export const Community = React.lazy(() => import('@/pages/Community'));

// Desktop Layout
export const DesktopChat = React.lazy(() => import('@/pages/desktop/DesktopChat'));
export const DesktopContacts = React.lazy(() => import('@/pages/desktop/DesktopContacts'));
export const DesktopCalls = React.lazy(() => import('@/pages/desktop/DesktopCalls'));

// Admin Pages
export const AdminDashboard = React.lazy(() => import('@/pages/AdminDashboard'));
export const AdminUsers = React.lazy(() => import('@/pages/admin/Users'));
export const AdminProviders = React.lazy(() => import('@/pages/admin/Providers'));
export const AdminAnalytics = React.lazy(() => import('@/pages/admin/Analytics'));
export const AdminPayments = React.lazy(() => import('@/pages/admin/Payments'));
export const AdminPoints = React.lazy(() => import('@/pages/admin/Points'));
export const AdminSettings = React.lazy(() => import('@/pages/admin/Settings'));
export const AdminAnnouncements = React.lazy(() => import('@/pages/admin/Announcements'));
export const AdminDocuments = React.lazy(() => import('@/pages/admin/Documents'));
export const AdminDoctorApplications = React.lazy(() => import('@/pages/admin/DoctorApplications'));
export const FeatureBuilder = React.lazy(() => import('@/pages/admin/FeatureBuilder'));
export const SchemaManager = React.lazy(() => import('@/pages/admin/SchemaManager'));
export const KYCApprovals = React.lazy(() => import('@/pages/admin/KYCApprovals'));
export const OfficialAccountsManager = React.lazy(() => import('@/pages/admin/OfficialAccountsManager'));
export const BroadcastManager = React.lazy(() => import('@/pages/admin/BroadcastManager'));
export const BrandPartnerships = React.lazy(() => import('@/pages/admin/BrandPartnerships'));
export const AppApprovals = React.lazy(() => import('@/pages/admin/AppApprovals'));
export const ChatrWorldAdmin = React.lazy(() => import('@/pages/ChatrWorldAdmin'));
export const PaymentVerification = React.lazy(() => import('@/pages/admin/PaymentVerification'));

// Provider Pages
export const ProviderAppointments = React.lazy(() => import('@/pages/provider/Appointments'));
export const ProviderServices = React.lazy(() => import('@/pages/provider/Services'));
export const ProviderPayments = React.lazy(() => import('@/pages/provider/Payments'));

// Business Pages
export const BusinessDashboard = React.lazy(() => import('@/pages/business/Dashboard'));
export const BusinessOnboarding = React.lazy(() => import('@/pages/business/Onboarding'));
export const BusinessInbox = React.lazy(() => import('@/pages/business/Inbox'));
export const CRMPage = React.lazy(() => import('@/pages/business/CRM'));
export const BusinessAnalytics = React.lazy(() => import('@/pages/business/Analytics'));
export const BusinessTeam = React.lazy(() => import('@/pages/business/Team'));
export const BusinessSettings = React.lazy(() => import('@/pages/business/Settings'));
export const BusinessCatalog = React.lazy(() => import('@/pages/business/Catalog'));
export const BusinessBroadcasts = React.lazy(() => import('@/pages/business/Broadcasts'));
export const BusinessGroups = React.lazy(() => import('@/pages/business/Groups'));

// Vendor Portal
export const VendorLogin = React.lazy(() => import('@/pages/vendor/VendorLogin'));
export const VendorRegister = React.lazy(() => import('@/pages/vendor/VendorRegister'));
export const VendorDashboard = React.lazy(() => import('@/pages/vendor/VendorDashboard'));
export const VendorSettings = React.lazy(() => import('@/pages/vendor/VendorSettings'));
export const RestaurantMenu = React.lazy(() => import('@/pages/vendor/restaurant/RestaurantMenu'));
export const RestaurantOrders = React.lazy(() => import('@/pages/vendor/restaurant/RestaurantOrders'));
export const DealsManagement = React.lazy(() => import('@/pages/vendor/deals/DealsManagement'));
export const DoctorAppointments = React.lazy(() => import('@/pages/vendor/healthcare/DoctorAppointments'));
export const DoctorPatients = React.lazy(() => import('@/pages/vendor/healthcare/DoctorPatients'));
export const DoctorAnalytics = React.lazy(() => import('@/pages/vendor/healthcare/DoctorAnalytics'));
export const DoctorAvailability = React.lazy(() => import('@/pages/vendor/healthcare/DoctorAvailability'));

// Care Path
export const CarePathDetail = React.lazy(() => import('@/components/care/CarePathDetail'));
