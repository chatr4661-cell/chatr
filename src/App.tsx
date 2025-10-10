// Emergency minimal App - no hooks, no providers, no dependencies
// This bypasses ALL React instance conflicts
const App = () => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        Chatr is Live! ✅
      </h1>
    </div>
  );
};

export default App;
