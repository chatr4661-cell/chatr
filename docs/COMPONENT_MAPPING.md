# React → Jetpack Compose Component Mapping

This document maps key React/TypeScript components from the Chatr+ app to their Jetpack Compose equivalents.

---

## 🎯 UI Component Library Mapping

### **shadcn/ui → Material 3 Compose**

| React Component (shadcn/ui) | Compose Equivalent | Notes |
|-----------------------------|-------------------|-------|
| `<Button>` | `Button()` | Material 3 has variants: Filled, Outlined, Text, Elevated, Tonal |
| `<Input>` | `TextField()` / `OutlinedTextField()` | Use OutlinedTextField for better UX |
| `<Card>` | `Card()` | Material 3 Card with elevation |
| `<Dialog>` | `AlertDialog()` / `Dialog()` | AlertDialog for simple, Dialog for custom |
| `<Sheet>` | `ModalBottomSheet()` | Material 3 bottom sheet |
| `<Tabs>` | `TabRow()` + `Tab()` | Scrollable or fixed tabs |
| `<Avatar>` | `AsyncImage()` (Coil) in `Box` with `clip(CircleShape)` | Custom composable |
| `<Badge>` | `Badge()` | Material 3 Badge |
| `<Checkbox>` | `Checkbox()` | Material 3 Checkbox |
| `<Switch>` | `Switch()` | Material 3 Switch |
| `<Slider>` | `Slider()` | Material 3 Slider |
| `<Progress>` | `LinearProgressIndicator()` / `CircularProgressIndicator()` | Two variants |
| `<Toast>` / `<Sonner>` | `Snackbar()` | Use SnackbarHost + Scaffold |
| `<Separator>` | `Divider()` / `HorizontalDivider()` | Material 3 Divider |
| `<ScrollArea>` | `LazyColumn()` / `LazyRow()` | For lists; `Column` + `verticalScroll()` for simple scroll |
| `<Dropdown>` | `DropdownMenu()` + `DropdownMenuItem()` | Material 3 Dropdown |
| `<Select>` | `ExposedDropdownMenuBox()` | Material 3 dropdown for forms |
| `<RadioGroup>` | `RadioButton()` in `Column` | Custom layout |
| `<Label>` | `Text()` with semantic modifier | Use `Text` with appropriate style |

---

## 📄 Page/Screen Mapping

### **Authentication Pages**

#### `/auth` - Auth.tsx
**React Code:**
```tsx
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  return (
    <Card>
      <Tabs value={isLogin ? "login" : "signup"}>
        <TabsList>
          <TabsTrigger onClick={() => setIsLogin(true)}>Login</TabsTrigger>
          <TabsTrigger onClick={() => setIsLogin(false)}>Sign Up</TabsTrigger>
        </TabsList>
      </Tabs>
      <Input placeholder="Email" />
      <Button onClick={handleAuth}>Continue</Button>
    </Card>
  );
}
```

**Kotlin/Compose Equivalent:**
```kotlin
// ui/screens/auth/AuthScreen.kt
@Composable
fun AuthScreen(
    navController: NavController,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var isLogin by remember { mutableStateOf(true) }
    val uiState by viewModel.uiState.collectAsState()
    
    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            TabRow(selectedTabIndex = if (isLogin) 0 else 1) {
                Tab(
                    selected = isLogin,
                    onClick = { isLogin = true },
                    text = { Text("Login") }
                )
                Tab(
                    selected = !isLogin,
                    onClick = { isLogin = false },
                    text = { Text("Sign Up") }
                )
            }
            
            Spacer(Modifier.height(24.dp))
            
            OutlinedTextField(
                value = uiState.email,
                onValueChange = { viewModel.updateEmail(it) },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth()
            )
            
            Spacer(Modifier.height(16.dp))
            
            Button(
                onClick = { viewModel.authenticate(isLogin) },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Continue")
                }
            }
            
            uiState.error?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
```

**ViewModel:**
```kotlin
// ui/screens/auth/AuthViewModel.kt
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()
    
    fun updateEmail(email: String) {
        _uiState.update { it.copy(email = email) }
    }
    
    fun authenticate(isLogin: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            val result = if (isLogin) {
                authRepository.login(_uiState.value.email)
            } else {
                authRepository.signup(_uiState.value.email)
            }
            
            result.fold(
                onSuccess = { /* Navigate */ },
                onFailure = { error ->
                    _uiState.update { it.copy(
                        isLoading = false,
                        error = error.message
                    )}
                }
            )
        }
    }
}

data class AuthUiState(
    val email: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)
```

---

### **Chat Pages**

#### `/chat` - Chat.tsx (Chat List)
**React Code:**
```tsx
export default function Chat() {
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations
  });
  
  return (
    <div>
      {conversations?.map(conv => (
        <ConversationItem key={conv.id} conversation={conv} />
      ))}
    </div>
  );
}
```

**Kotlin/Compose Equivalent:**
```kotlin
// ui/screens/chat/ChatListScreen.kt
@Composable
fun ChatListScreen(
    navController: NavController,
    viewModel: ChatListViewModel = hiltViewModel()
) {
    val conversations by viewModel.conversations.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chats") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* New chat */ }) {
                Icon(Icons.Default.Add, contentDescription = "New Chat")
            }
        }
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            conversations.isEmpty() -> {
                EmptyStateView(
                    icon = Icons.Default.ChatBubbleOutline,
                    message = "No conversations yet"
                )
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                ) {
                    items(
                        items = conversations,
                        key = { it.id }
                    ) { conversation ->
                        ConversationItem(
                            conversation = conversation,
                            onClick = {
                                navController.navigate("chat/${conversation.id}")
                            }
                        )
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}

@Composable
fun ConversationItem(
    conversation: Conversation,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = { Text(conversation.name) },
        supportingContent = { Text(conversation.lastMessage ?: "") },
        leadingContent = {
            AsyncImage(
                model = conversation.avatarUrl,
                contentDescription = null,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
        },
        trailingContent = {
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = conversation.timestamp.formatRelative(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (conversation.unreadCount > 0) {
                    Badge {
                        Text(conversation.unreadCount.toString())
                    }
                }
            }
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}
```

**ViewModel:**
```kotlin
@HiltViewModel
class ChatListViewModel @Inject constructor(
    private val conversationRepository: ConversationRepository
) : ViewModel() {
    
    private val _conversations = MutableStateFlow<List<Conversation>>(emptyList())
    val conversations: StateFlow<List<Conversation>> = _conversations.asStateFlow()
    
    private val _uiState = MutableStateFlow(ChatListUiState())
    val uiState: StateFlow<ChatListUiState> = _uiState.asStateFlow()
    
    init {
        loadConversations()
    }
    
    private fun loadConversations() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            
            conversationRepository.getConversations()
                .collect { result ->
                    _conversations.value = result
                    _uiState.update { it.copy(isLoading = false) }
                }
        }
    }
}

data class ChatListUiState(
    val isLoading: Boolean = false
)
```

---

### **Profile Page**

#### `/profile` - Profile.tsx
**Kotlin/Compose:**
```kotlin
@Composable
fun ProfileScreen(
    navController: NavController,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val profile by viewModel.profile.collectAsState()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Profile header
            item {
                ProfileHeader(
                    avatarUrl = profile.avatarUrl,
                    displayName = profile.displayName,
                    username = profile.username,
                    onEditClick = { /* Navigate to edit */ }
                )
            }
            
            // Stats section
            item {
                ProfileStats(
                    points = profile.points,
                    level = profile.level,
                    referrals = profile.referrals
                )
            }
            
            // Settings sections
            item {
                SettingsSection(
                    title = "Account",
                    items = listOf(
                        SettingItem("Edit Profile", Icons.Default.Edit) { /* action */ },
                        SettingItem("Privacy", Icons.Default.Lock) { /* action */ },
                        SettingItem("Notifications", Icons.Default.Notifications) { /* action */ }
                    )
                )
            }
        }
    }
}

@Composable
fun ProfileHeader(
    avatarUrl: String?,
    displayName: String,
    username: String,
    onEditClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box {
            AsyncImage(
                model = avatarUrl,
                contentDescription = null,
                modifier = Modifier
                    .size(120.dp)
                    .clip(CircleShape)
                    .border(4.dp, MaterialTheme.colorScheme.primary, CircleShape),
                contentScale = ContentScale.Crop
            )
            
            // Edit button overlay
            IconButton(
                onClick = onEditClick,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(40.dp)
                    .background(
                        MaterialTheme.colorScheme.primaryContainer,
                        CircleShape
                    )
            ) {
                Icon(Icons.Default.Edit, contentDescription = "Edit")
            }
        }
        
        Spacer(Modifier.height(16.dp))
        
        Text(
            text = displayName,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        
        Text(
            text = "@$username",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
```

---

## 🔄 Hook → ViewModel/UseCase Mapping

| React Hook | Kotlin Equivalent | Implementation |
|-----------|------------------|----------------|
| `useQuery()` | `StateFlow` in ViewModel | `viewModelScope.launch { repository.getData().collect { _state.value = it } }` |
| `useMutation()` | `suspend fun` in ViewModel | `viewModelScope.launch { repository.updateData(...) }` |
| `useState()` | `mutableStateOf()` / `MutableStateFlow` | `var count by remember { mutableStateOf(0) }` |
| `useEffect()` | `LaunchedEffect()` / `DisposableEffect()` | `LaunchedEffect(key) { /* side effect */ }` |
| `useContext()` | Hilt Dependency Injection | `@Inject constructor(repo: Repository)` |
| `useCallback()` | `remember { }` | `val onClick = remember { { action() } }` |
| `useMemo()` | `derivedStateOf()` | `val filteredList by remember { derivedStateOf { list.filter { ... } } }` |
| `useRef()` | `remember { mutableStateOf() }` | `val textFieldRef = remember { mutableStateOf<TextFieldValue>() }` |

---

## 🎨 Styling: Tailwind CSS → Compose Modifiers

### Layout
| Tailwind Class | Compose Modifier |
|---------------|------------------|
| `flex` | `Row()` or `Column()` |
| `flex-col` | `Column()` |
| `flex-row` | `Row()` |
| `justify-center` | `horizontalArrangement = Arrangement.Center` |
| `items-center` | `verticalAlignment = Alignment.CenterVertically` |
| `p-4` | `Modifier.padding(16.dp)` |
| `px-4` | `Modifier.padding(horizontal = 16.dp)` |
| `mt-4` | `Modifier.padding(top = 16.dp)` |
| `w-full` | `Modifier.fillMaxWidth()` |
| `h-screen` | `Modifier.fillMaxHeight()` |
| `rounded-lg` | `Modifier.clip(RoundedCornerShape(8.dp))` |
| `shadow-md` | `Modifier.shadow(4.dp)` |
| `bg-primary` | `Modifier.background(MaterialTheme.colorScheme.primary)` |

### Typography
| Tailwind Class | Compose Modifier |
|---------------|------------------|
| `text-lg` | `style = MaterialTheme.typography.titleLarge` |
| `font-bold` | `fontWeight = FontWeight.Bold` |
| `text-center` | `textAlign = TextAlign.Center` |
| `text-white` | `color = Color.White` |
| `text-primary` | `color = MaterialTheme.colorScheme.primary` |

### Interactions
| Tailwind Class | Compose Modifier |
|---------------|------------------|
| `cursor-pointer` | `Modifier.clickable { }` |
| `hover:bg-gray-100` | Use `hoverable()` modifier (desktop only) |
| `active:scale-95` | Use `Modifier.graphicsLayer { scaleX/Y = animatedScale }` |

---

## 🧩 Complex Component Examples

### Live Location Sharing Card

**React:**
```tsx
<Card>
  <CardHeader>
    <MapPin className="h-6 w-6" />
    <span>Share Live Location</span>
  </CardHeader>
  <Select value={duration} onValueChange={setDuration}>
    <SelectItem value="15m">15 minutes</SelectItem>
    <SelectItem value="1h">1 hour</SelectItem>
  </Select>
  <Button onClick={startSharing}>Start Sharing</Button>
</Card>
```

**Compose:**
```kotlin
@Composable
fun LiveLocationCard(
    onStartSharing: (duration: Duration) -> Unit
) {
    var selectedDuration by remember { mutableStateOf(Duration.MINUTES_15) }
    var expanded by remember { mutableStateOf(false) }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = "Share Live Location",
                    style = MaterialTheme.typography.titleMedium
                )
            }
            
            Spacer(Modifier.height(16.dp))
            
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = it }
            ) {
                OutlinedTextField(
                    value = selectedDuration.displayName,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Duration") },
                    trailingIcon = {
                        Icon(Icons.Default.ArrowDropDown, null)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                
                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    Duration.values().forEach { duration ->
                        DropdownMenuItem(
                            text = { Text(duration.displayName) },
                            onClick = {
                                selectedDuration = duration
                                expanded = false
                            }
                        )
                    }
                }
            }
            
            Spacer(Modifier.height(16.dp))
            
            Button(
                onClick = { onStartSharing(selectedDuration) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.LocationOn, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Start Sharing")
            }
        }
    }
}

enum class Duration(val displayName: String) {
    MINUTES_15("15 minutes"),
    HOUR_1("1 hour"),
    CONTINUOUS("Until turned off")
}
```

---

## 📊 Navigation Mapping

### React Router → Compose Navigation

**React:**
```tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<Auth />} />
  <Route path="/chat/:id" element={<Chat />} />
</Routes>
```

**Compose:**
```kotlin
@Composable
fun ChatrNavHost(navController: NavHostController = rememberNavController()) {
    NavHost(navController, startDestination = "home") {
        composable("home") {
            IndexScreen(navController)
        }
        composable("auth") {
            AuthScreen(navController)
        }
        composable(
            route = "chat/{conversationId}",
            arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getString("conversationId")!!
            ChatConversationScreen(navController, conversationId)
        }
    }
}

// Navigation usage
navController.navigate("chat/${conversationId}")
navController.popBackStack()
```

---

## 🎯 Summary

**Key Takeaways:**
1. **Material 3 is your friend** - Most shadcn/ui components have direct Material 3 equivalents
2. **State management changes** - Replace TanStack Query with ViewModels + StateFlow
3. **Modifiers replace CSS** - Compose uses modifier chains instead of class names
4. **Composition over inheritance** - Build complex UIs by composing small functions
5. **Remember state** - Use `remember`, `rememberSaveable` for state across recompositions

**Next:** See [PLUGIN_MIGRATION.md](./PLUGIN_MIGRATION.md) for native SDK integrations.
