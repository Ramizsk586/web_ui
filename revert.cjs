const { execSync } = require('child_process');
try {
  execSync('git checkout src/App.tsx', { stdio: 'inherit' });
  console.log('SUCCESSFULLY REVERTED SRC/APP.TSX');
} catch (err) {
  console.error('FAILED TO REVERT:', err.message);
}
