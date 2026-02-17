const { execSync } = require('child_process');

console.log('Test 1: Grade B with --fail-on C (should PASS)');
try {
  execSync('node dist/cli/index.js audit tests/casing-mixed.yaml --fail-on C', { stdio: 'pipe' });
  console.log('✅ PASSED - Exit code 0\n');
} catch (e) {
  console.log('❌ FAILED - Exit code', e.status, '\n');
}

console.log('Test 2: Grade F with --fail-on C (should FAIL)');
try {
  execSync('node dist/cli/index.js audit tests/horrible-api.yaml --fail-on C', { stdio: 'pipe' });
  console.log('❌ UNEXPECTED PASS - Exit code 0\n');
} catch (e) {
  console.log('✅ EXPECTED FAIL - Exit code', e.status, '\n');
}

console.log('Test 3: Grade B with --fail-on B (should PASS)');
try {
  execSync('node dist/cli/index.js audit tests/casing-mixed.yaml --fail-on B', { stdio: 'pipe' });
  console.log('✅ PASSED - Exit code 0\n');
} catch (e) {
  console.log('❌ FAILED - Exit code', e.status, '\n');
}

console.log('Test 4: Grade B with --fail-on A (should FAIL)');
try {
  execSync('node dist/cli/index.js audit tests/casing-mixed.yaml --fail-on A', { stdio: 'pipe' });
  console.log('❌ UNEXPECTED PASS - Exit code 0\n');
} catch (e) {
  console.log('✅ EXPECTED FAIL - Exit code', e.status, '\n');
}

console.log('All tests completed!');
