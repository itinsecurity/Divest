# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Style

**Be concise**: Avoid repetitive announcements. Don't say "I will now..." then "Now writing..." then "Completed...". Just do the work and report results once. Actions speak louder than narration.

**No pre-edit diffs**: If you have permission to edit a file, make the edit directly. Don't show the user what you're about to change - just do it and report the result.

## Development Workflow

### Branch Management (GitHub Flow)
All code changes follow GitHub Flow principles:
- Never work directly on main branch (except documentation-only changes)
- Create feature branch for each change (`feature/`, `bugfix/`, `chore/`, `hotfix/`)
- Always verify you are on the correct branch before making changes
- GitHub auto-deletes branches after PR merge
- Main branch is always production-ready

### Branch Naming Convention
- Features: `feature/description-of-feature`
- Bugfixes: `bugfix/description-of-bug`
- Chores: `chore/description-of-task`
- Hotfixes: `hotfix/critical-issue`

Examples:
- `feature/add-user-authentication`
- `bugfix/fix-login-redirect`
- `chore/update-dependencies`

### Development Sequence (MANDATORY ORDER)

1. **Local Automated Testing** (Agent executes):
   - Run unit tests
   - Run integration tests
   - All tests must pass before proceeding

2. **Code Formatting** (Agent performs automatically before commit):
   - Format code according to project standards
   - This is automatic - part of maintaining code quality
   - No need to announce formatting actions

3. **Commit and Push to GitHub** (Agent performs):
   - Stage changes with meaningful commit message
   - Push feature branch to remote: `git push -u origin <branch-name>`
   - Code must be on GitHub before manual testing

4. **Create Pull Request** (Agent performs immediately):
   - Create PR with descriptive title: `[Feature/Bugfix/Hotfix/Chore]: Description`
   - PR body must include:
     - What changes were made
     - Why changes were necessary
     - How to test the changes
     - Deployment notes (if applicable)
   - Link related GitHub issues
   - PR created before manual testing for efficiency

5. **CI/Security Checks** (Automated):
   - Wait for all CI checks to pass
   - Security scans must complete successfully
   - Code quality checks must pass
   - Only proceed to deployment if CI passes

6. **Deploy to Test Environment** (Agent triggers, conditional):
   - **Only deploy if:**
     - CI checks passed successfully
     - Changes require runtime testing (code, configuration)
   - **Skip deployment for:**
     - Documentation-only changes
     - Workflow/CI configuration changes (unless testing the workflow itself)
     - Minor configuration tweaks that don't affect runtime
   - Use agent judgment based on change nature

7. **Manual Testing** (User performs, if deployed):
   - User performs acceptance testing in test environment
   - User verifies functionality meets requirements
   - If issues found: commit fixes to same branch (returns to step 1)
   - PR automatically updates with new commits
   - CI runs again on updated commits

8. **PR Approval and Merge** (After successful testing):
   - Manual review and approval required
   - All automated checks must pass
   - Verify test environment behavior matches expectations
   - Merge to main after approval
   - GitHub auto-deletes feature branch

**Rationale**: This sequence ensures code quality through automated testing, pushes code before manual testing so test environment has access, creates PR early for visibility and efficient iteration, and ensures production deployments only come from verified, approved code on main branch.

### Direct Pushes to Main (Exception)
Documentation-only changes may be pushed directly to main:
- Updates to CLAUDE.md, README.md, or other documentation files
- No code, configuration, or infrastructure changes
- Use judgment: when in doubt, use PR process

## Environment Strategy

- **test** - Test environment (deploy from any branch after CI passes)
- **prod** - Production environment (deploy only from main branch)

## Security Requirements (NON-NEGOTIABLE)

Security is non-negotiable:
- No secrets in code (use AWS Secrets Manager/Parameter Store)
- Never commit secrets to repository
- Environment variables for configuration only
- All dependencies must pass security scans
- PR cannot be merged with security vulnerabilities
- Input validation at all system boundaries
- Authentication and authorization required for protected endpoints

### Security Scanning
All PRs must pass:
- Security dependency scans
- Code security analysis
- Linting with security rules enabled

### Security Scanner Exemptions
Exemptions require documented justification in configuration files with rationale and review dates.

## Code Quality Standards

### Automated Quality Gates
Code must meet quality gates:
- Automated formatting enforced (project-specific formatters)
- Type checking enforced (if applicable to language)
- Linting with security rules enabled
- Code must be formatted before commits (automatic)
- All CI checks must pass before merge

### CI Workflow Design
- Security scans run on PR creation and updates
- Use efficient workflow patterns (e.g., concurrency groups to cancel outdated runs)
- Final checks before merge approval

## Testing Requirements

- Unit tests required for new features and bug fixes
- Integration tests required for API changes and cross-component features
- Manual testing checklist required for UI changes
- Test-first development encouraged

## Platform & Infrastructure

### Technical Standards
- **Preferred cloud platform**: AWS
- Leverage AWS managed services to reduce operational complexity
- Use AWS best practices for architecture and security
- Consider AWS-native solutions before third-party alternatives
- Infrastructure as code for all AWS resources

## Pull Request Requirements

### PR Title Format
Follow convention: `[Feature/Bugfix/Hotfix/Chore]: Description`

Examples:
- `[Feature]: Add user authentication`
- `[Bugfix]: Fix login redirect loop`
- `[Chore]: Update dependencies to latest versions`

### PR Body Must Include
- **What** changes were made
- **Why** changes were necessary
- **How** to test the changes
- **Deployment notes** (if applicable - AWS resources, environment variables, etc.)
- Link to related GitHub issues

### PR Process
- Request appropriate reviewers
- All automated checks must pass
- Manual code review required
- Human approval required before merge

## GitHub Integration

### Using GitHub CLI (gh)
Claude Code uses `gh` CLI for:
- Creating branches
- Creating pull requests: `gh pr create`
- Checking PR status: `gh pr status`
- Viewing issues: `gh issue list`
- Triggering workflows: `gh workflow run`

## Governance

### Quality Gates
All PRs must pass:
- Security scans
- Code quality checks (formatting, linting, type checking)
- Test suite (unit + integration tests)
- Manual code review

### Development Guidance
- GitHub is the single source of truth
- Human approval required before merge to main
- Claude Code assists with commits, PRs, and deployments
- When ending session, update project status documentation
- Decisions must have basis in relevant authoritative sources
- When troubleshooting, consult authoritative sources before trial and error

## Project Status

*This section will be updated as the project develops.*

### Active Branch
`main` - Initial repository setup

### Current Status
Repository initialized. Awaiting project setup and initial implementation.

### Known Issues
None currently.
