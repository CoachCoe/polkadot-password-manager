#!/bin/bash

# Fix import paths in built JavaScript files to add .js extensions
find dist -name '*.js' -exec sed -i '' 's|from '\''\.\./utils/logger'\''|from '\''\.\./utils/logger.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\./utils/logger'\''|from '\''\./utils/logger.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\.\./utils/encryption'\''|from '\''\.\./utils/encryption.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\./utils/encryption'\''|from '\''\./utils/encryption.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\.\./utils/validation'\''|from '\''\.\./utils/validation.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\./utils/validation'\''|from '\''\./utils/validation.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\.\./utils/errors'\''|from '\''\.\./utils/errors.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\./utils/errors'\''|from '\''\./utils/errors.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\.\./config/security'\''|from '\''\.\./config/security.js'\''|g' {} \;
find dist -name '*.js' -exec sed -i '' 's|from '\''\./config/security'\''|from '\''\./config/security.js'\''|g' {} \;
