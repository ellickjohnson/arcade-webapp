# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature 1
- New feature 2

### Changed
- Updated dependency X to version Y

### Deprecated
- Feature A is deprecated and will be removed in version 2.0

### Removed
- Old feature B

### Fixed
- Bug fix 1
- Bug fix 2

### Security
- Security patch 1

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Core features implemented
- Basic functionality

---

## Version Guidelines

### Version Format: MAJOR.MINOR.PATCH

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

### Release Process

1. Update version in package.json/pyproject.toml
2. Update CHANGELOG.md with release notes
3. Commit changes: `git commit -m "chore: release version X.X.X"`
4. Create git tag: `git tag vX.X.X`
5. Push tag: `git push origin vX.X.X`
6. GitHub Actions will automatically create release and build Docker image

### Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes
