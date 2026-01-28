# Contributing to ReadmeMuse

Thank you for your interest in contributing to ReadmeMuse! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/nazrul-kabir/ReadmeMuse/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node.js version, OS, etc.)

### Suggesting Features

1. Check existing issues and discussions
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Potential implementation approach

### Pull Requests

1. **Fork the repository** and create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow existing code style
   - Write clear, concise commit messages
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   npm run build
   npm test
   ```

4. **Submit a pull request**:
   - Provide a clear description of changes
   - Reference related issues
   - Ensure CI passes

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/nazrul-kabir/ReadmeMuse.git
   cd ReadmeMuse
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Code Style

- Use TypeScript for all new code
- Follow existing formatting conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Aim for high test coverage
- Test edge cases and error handling

## Documentation

- Update README.md for user-facing changes
- Update code comments for implementation details
- Add JSDoc comments for public APIs
- Update DEPLOYMENT.md for deployment-related changes

## Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(analyzer): add support for TypeScript projects
fix(webhook): handle missing repository field
docs(readme): update installation instructions
```

## Questions?

Feel free to open an issue for questions or discussions.

Thank you for contributing! 🎉
