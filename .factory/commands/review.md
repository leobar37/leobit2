---
description: Review code changes against original task requirements and
  implementation quality
---

# Code Review Against Original Task

Review the modified code changes evaluating how well they implement the original task that was given.

## Task Context:
$ARGUMENTS

## Review Focus: Task vs Implementation

### 1. Task Requirement Fulfillment
- **Completeness**: Does the implementation fully address the original task?
- **Accuracy**: Does it solve exactly what was requested?
- **Scope**: No over-engineering beyond task requirements
- **Functionality**: All required features are properly implemented

### 2. Implementation Quality
- **Code Quality**: Readability, maintainability, best practices
- **Error Handling**: Proper edge cases and error scenarios
- **Performance**: Efficient solution for the task requirements
- **Testing**: Appropriate test coverage for the implemented functionality

### 3. Simplicity & Pragmatism
- **KISS Principle**: Simplest solution that meets task requirements
- **No Gold Plating**: No unnecessary features beyond task scope
- **Clear Logic**: Straightforward implementation that's easy to understand
- **Appropriate Complexity**: Complexity matches task requirements

### 4. Technical Correctness
- **Library Usage**: Correct and efficient use of libraries/frameworks
- **Architecture**: Follows existing patterns and best practices
- **Security**: No security vulnerabilities in the implementation
- **Integration**: Proper integration with existing codebase

## Evaluation Process

### Step 1: Task Analysis
- **With $ARGUMENTS**: Use the provided task description
- **Without $ARGUMENTS**: Look for the original task in this conversation
- Identify key requirements and constraints
- Determine expected outcomes

### Step 2: Implementation Review
- Examine what was actually implemented
- Compare against original task requirements
- Identify gaps or deviations

### Step 3: Quality Assessment
- Evaluate technical implementation quality
- Check for best practices and patterns
- Assess maintainability and scalability

## Output Format

### 📋 Task vs Implementation Summary
- **Original Task**: [Brief description from $ARGUMENTS or conversation]
- **What Was Implemented**: [Brief description]
- **Alignment Score**: [X/10]

### ✅ Task Fulfillment
- ✅ Requirements fully met
- ✅ No scope creep
- ✅ Correct functionality

### ⚠️ Implementation Issues
- [ ] Missing requirements
- [ ] Over-engineering
- [ ] Quality concerns
- [ ] Technical debt

### 🔍 Detailed Analysis
**Task Alignment**: [Assessment]
**Code Quality**: [Assessment]
**Simplicity**: [Assessment]
**Technical Correctness**: [Assessment]

### 💡 Recommendations
Specific actions to better align with original task or improve quality

### 🎯 Final Assessment
- [ ] ✅ **Approved** - Perfectly implements the task
- [ ] ✅ **Approved with minor suggestions** - Good implementation, small improvements
- [ ] ⚠️ **Requires changes** - Missing task requirements or quality issues
- [ ] ❌ **Needs major revision** - Significant deviation from task or poor quality

## Rules
- **TASK-CENTRIC**: Always evaluate against the original task requirements
- **COMPLETE**: Check that all task requirements are fulfilled
- **FOCUSED**: No extra features beyond what was requested
- **PRACTICAL**: Ensure the solution is practical and maintainable
- **FLEXIBLE**: Works with or without explicit task arguments
- **CONTEXT-AWARE**: When no arguments provided, find original task in conversation
