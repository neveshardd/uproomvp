// Debug script to test login redirect flow
console.log('🔍 Debugging login redirect flow...');

// Simulate the current URL scenarios
const testScenarios = [
  {
    name: 'After company creation redirect',
    url: 'http://acme.localhost:8080/login',
    description: 'User is redirected here after creating a company'
  },
  {
    name: 'After successful login',
    url: 'http://acme.localhost:8080/',
    description: 'User should be redirected here after login'
  },
  {
    name: 'Double subdomain issue',
    url: 'http://acme.acme.localhost:8080/',
    description: 'This is the problematic URL that users are seeing'
  }
];

testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log(`   URL: ${scenario.url}`);
  console.log(`   Description: ${scenario.description}`);
  
  try {
    const url = new URL(scenario.url);
    const hostname = url.hostname;
    const parts = hostname.split('.');
    
    console.log(`   Hostname: ${hostname}`);
    console.log(`   Parts: [${parts.join(', ')}]`);
    
    // Simulate subdomain extraction logic
    let extractedSubdomain = null;
    if (hostname.includes('localhost')) {
      if (parts.length >= 2 && parts[1] === 'localhost') {
        extractedSubdomain = parts[0];
      }
    }
    
    console.log(`   Extracted subdomain: ${extractedSubdomain || 'none'}`);
    
    // Check for double subdomain
    if (parts.length > 2 && parts[0] === parts[1]) {
      console.log(`   ⚠️  DOUBLE SUBDOMAIN DETECTED: ${parts[0]}.${parts[1]}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error parsing URL: ${error.message}`);
  }
});

console.log('\n🔧 Potential solutions:');
console.log('1. Ensure Login component uses absolute URLs for redirects');
console.log('2. Check that no other components are adding extra redirects');
console.log('3. Verify WorkspaceRouter handles authenticated users correctly');
console.log('4. Make sure DashboardRouter doesn\'t interfere with root path on subdomains');