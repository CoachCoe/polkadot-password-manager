#!/usr/bin/env node

/**
 * Fix SSO Server Import Issues
 * This script fixes the ES module import paths in the polkadot-sso dist files
 */

const fs = require('fs');
const path = require('path');

const SSO_DIST_PATH = '/Users/shawncoe/Documents/dev/polkadot-sso/packages/sso/dist';

console.log('🔧 Fixing SSO server import issues...');

// Files to fix
const filesToFix = [
  'app.js',
  'index.js'
];

// Import mappings
const importMappings = [
  // Directory imports that need explicit .js extensions
  { from: "from './routes/auth'", to: "from './routes/auth/index.js'" },
  { from: "from './services/auditService'", to: "from './services/auditService.js'" },
  { from: "from './services/challengeService'", to: "from './services/challengeService.js'" },
  { from: "from './services/token'", to: "from './services/token.js'" },
  { from: "from './utils/logger'", to: "from './utils/logger.js'" },
  { from: "from './config'", to: "from './config/index.js'" },
  { from: "from './middleware'", to: "from './middleware/index.js'" },
  { from: "from './modules'", to: "from './modules/index.js'" },
  { from: "from './utils'", to: "from './utils/index.js'" },
  { from: "from './services'", to: "from './services/index.js'" },
  { from: "from './routes'", to: "from './routes/index.js'" },
  { from: "from './types'", to: "from './types/index.js'" },
  
  // Specific file imports
  { from: "from './app'", to: "from './app.js'" },
  { from: "from './utils/logger'", to: "from './utils/logger.js'" },
  { from: "from './services/challengeService'", to: "from './services/challengeService.js'" },
  { from: "from './services/siweStyleAuthService'", to: "from './services/siweStyleAuthService.js'" },
  { from: "from './services/token'", to: "from './services/token.js'" },
  { from: "from './routes/auth'", to: "from './routes/auth.js'" },
  { from: "from './utils'", to: "from './utils/index.js'" },
  { from: "from './config'", to: "from './config/index.js'" }
];

function fixImports(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const mapping of importMappings) {
    if (content.includes(mapping.from)) {
      content = content.replace(new RegExp(mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), mapping.to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed imports in: ${path.basename(filePath)}`);
  } else {
    console.log(`ℹ️  No changes needed in: ${path.basename(filePath)}`);
  }
}

// Fix all files
for (const file of filesToFix) {
  const filePath = path.join(SSO_DIST_PATH, file);
  fixImports(filePath);
}

console.log('🎉 SSO import fixes completed!');
console.log('\n📋 Next steps:');
console.log('1. cd /Users/shawncoe/Documents/dev/polkadot-sso/packages/sso');
console.log('2. node dist/index.js');
console.log('3. Test: curl http://localhost:3001/health');
