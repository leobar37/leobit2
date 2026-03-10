---
description: >
  Analyze React code for prop drilling, large components, and risky useEffects.

  Detecta código con problemas comunes: prop drilling excesivo, componentes
  enormes con muchos useState,

  y useEffects con dependencias riesgosas. Sugiere refactoring usando contextos
  y componentes más pequeños.

  Triggers: react:fix, react:drilling, analyze react, fix react, react analysis,
  componentes grandes, prop drilling.

  Accepts: path to file/folder (e.g., "src/components") or feature description
  (e.g., "users management")
---

# React Code Analysis: Prop Drilling, Large Components & Risky useEffects

You are a React code quality expert. Analyze the given React code for common anti-patterns and provide actionable refactoring suggestions.

## Input Processing

**Given input:** `$ARGUMENTS`

Determine what to analyze:
- If it looks like a **path** (contains `/`, `\`, starts with `src/`, `components/`, etc.): Search in that specific location
- If it's a **feature description** (natural language like "users management", "shopping cart"): Search for related React files in the codebase

## Analysis Scope

1. **Prop Drilling Detection**
2. **Large Component Detection**
3. **Risky useEffects Detection**

---

## 1. Prop Drilling Detection

### What to look for:

- **Pass-through props**: Props received but not used directly, only passed to children
  ```jsx
  // BAD - UserCard receives and passes theme to children without using it
  function UserCard({ user, theme, onUpdate }) {
    return <UserAvatar theme={theme} onUpdate={onUpdate} />;
  }
  ```

- **Props passed through multiple levels**: Same prop passed 3+ levels down

- **Context candidates**: When 3+ components need the same data, suggest Context

### Detection patterns:
- Search for `function ComponentName({` patterns
- Look for props that appear in JSX but not in component logic
- Count prop depth: trace from where prop originates to final consumer

---

## 2. Large Component Detection

### Thresholds:

| Metric | Warning | Critical |
|--------|---------|----------|
| useState count | > 5 | > 10 |
| useEffect count | > 3 | > 5 |
| Lines of code | > 200 | > 400 |
| Props count | > 7 | > 12 |

### What to look for:

- **Multiple useState**: Component managing too much state
  ```jsx
  // CRITICAL - 8 useState in one component
  function UserForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [zip, setZip] = useState('');
    const [loading, setLoading] = useState(false);
    // ... more state
  }
  ```

- **Multiple responsibilities**: Component doing data fetching, UI, forms, validation

- **Extract indicators**: Comments like "// TODO: extract", "// split this component"

### Detection approach:
- Use Grep to find `useState(` and count occurrences per file
- Use Read to count lines in component files
- Count props in function signatures

---

## 3. Risky useEffects Detection

### Critical patterns:

#### a) Objects/Arrays in dependencies (reference equality issue)
```jsx
// BAD - obj changes every render, infinite loop
const options = { timeout: 5000 };
useEffect(() => {
  fetchData(options);
}, [options]); // ⚠️ Reference changes every render!

// FIX: Use useMemo or primitive values
const timeout = 5000;
useEffect(() => {
  fetchData({ timeout });
}, [timeout]);
```

#### b) Functions in dependencies
```jsx
// BAD - function recreated every render
const handleSubmit = () => { /* ... */ };
useEffect(() => {
  handleSubmit();
}, [handleSubmit]); // ⚠️ New function every render!

// FIX: Use useCallback
const handleSubmit = useCallback(() => { /* ... */ }, []);
useEffect(() => {
  handleSubmit();
}, [handleSubmit]);
```

#### c) Missing dependencies (eslint-disable hints)
```jsx
// Look for eslint-disable lines - usually indicate missing deps
// eslint-disable react-hooks/exhaustive-deps
useEffect(() => {
  doSomething(); // Uses but doesn't list 'value' as dep
}, []); // ⚠️ Missing 'value' dependency
```

#### d) No cleanup for event listeners/subscriptions
```jsx
// BAD - Memory leak
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []); // ⚠️ No cleanup!

// FIX:
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Detection patterns:
- Search for `useEffect(` and analyze their dependency arrays
- Look for `eslint-disable` comments near useEffect
- Check for missing cleanup functions (no `return` in useEffect)

---

## Output Format

Generate a structured report:

```markdown
# React Code Analysis Report

## Input Analyzed: [path or feature description]

---

## 🚨 Critical Issues

### 1. [Issue Type] - [File:Line]
**Problem:** [Description]
```jsx
// Problematic code
```
**Impact:** [What goes wrong]
**Suggestion:** [How to fix]

---

## ⚠️ Warnings

### 1. [Issue Type] - [File:Line]
**Problem:** [Description]
**Suggestion:** [How to fix]

---

## 📊 Statistics

- **Files analyzed:** [N]
- **Components with prop drilling:** [N]
- **Large components:** [N]
- **Risky useEffects:** [N]

---

## 🎯 Refactoring Plan

### For Prop Drilling:
1. Identify shared state → Create Context
2. Extract intermediate components that only pass props

### For Large Components:
1. Split by responsibility (fetching, form, display)
2. Extract custom hooks for reusable logic
3. Use composition (children prop, slot pattern)

### For Risky useEffects:
1. Move functions outside component or use useCallback
2. Use primitive values or useMemo for objects/arrays
3. Always return cleanup function
4. Fix missing dependencies properly

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Prop Drilling | N | High/Medium |
| Large Components | N | High/Medium |
| Risky useEffects | N | High/Medium |

**Overall Health:** [Good/Needs Attention/Critical]
```

---

## Execution

1. **Parse input**: Determine if path or feature description
2. **Find React files**: Use Glob for `.tsx`, `.jsx` patterns
3. **Analyze each category**: Apply detection patterns
4. **Generate report**: Structure findings with severity

Be specific with file paths and line numbers. Provide actual code snippets from the files being analyzed.
