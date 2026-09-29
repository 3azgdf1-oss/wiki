export default [ {
	files: [ '**/*.js' ],
	languageOptions: { ecmaVersion: 2017, sourceType: 'script', globals: {
		mw: 'readonly', document: 'readonly', window: 'readonly', getComputedStyle: 'readonly', NodeFilter: 'readonly', WeakMap: 'readonly', Math: 'readonly', Array: 'readonly', isNaN: 'readonly', parseFloat: 'readonly', typeof: 'readonly'
	} },
	rules: { 'no-undef': 'error', 'no-unused-vars': 'error', 'no-redeclare': 'error', eqeqeq: 'error', 'no-var': 'off', 'no-shadow': 'warn', 'no-implicit-globals': 'error', strict: [ 'error', 'function' ] }
} ];
