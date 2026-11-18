import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
test('.env parser treats shell metacharacters as data and environment values take precedence', () => {
  const result = execFileSync('python3', ['-c', `
import importlib.util, pathlib, tempfile
spec = importlib.util.spec_from_file_location('configure_native', 'scripts/configure-native.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as directory:
    path = pathlib.Path(directory) / '.env'
    path.write_text('TDESKTOP_API_ID=123\\nTDESKTOP_API_HASH="$(echo untrusted)"\\nUNRELATED=ignored\\n')
    result = module.settings({'TDESKTOP_API_ID': '456'}, path)
    assert result['TDESKTOP_API_ID'] == '456'
    assert result['TDESKTOP_API_HASH'] == '$(echo untrusted)'
    assert 'UNRELATED' not in result
print('ok')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'ok');
});
