## 🚧 Development Status — Active Project
[![Mission Tracker CI](https://github.com/mcariello1/mission_tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/mcariello1/mission_tracker/actions/workflows/ci.yml)
**Mission Tracker is an actively developed full-stack application designed to coordinate search-and-rescue operations, manage responder participation, and visualize missions geographically.**

This project began as an opportunity to demonstrate my approach to a real-world engineering problem: translating operational requirements into a functional application with a relational database, REST API, interactive frontend, and automated tests.

Rather than presenting a static coding exercise, I'm building and iterating on a system that demonstrates full-stack development, database design, debugging, testing, and technical decision-making.

### Current Implementation

- **Backend:** Python, FastAPI, PostgreSQL, RESTful APIs
- **Frontend:** React, JavaScript, Vite, CSS
- **Geospatial:** MapLibre GL JS with interactive topographic mapping
- **Testing:** Pytest with a dedicated PostgreSQL test database

### Implemented Features

- Mission creation, activation, completion, and history
- Team management and responder assignments
- Responder check-in/check-out with participation tracking
- Automated calculation of responder mission hours
- Mission activity logging
- Interactive topographic map with persistent mission coordinates
- Location selection, confirmation, and cancellation workflows
- Backend integration tests covering mission operations and location validation

### Current Development Focus

- Manual responder positioning and GPS-ready location architecture
- Responder location history and map visualization
- Additional frontend functionality and responsive UI improvements

### Planned Enhancements

- Playwright end-to-end testing with automated screenshots and reports
- GitHub Actions CI/CD integration
- AI-assisted pull request reviews
- Automated QA evidence and reporting
- AI-generated mission summaries with evaluation tests
- Deployment and production-readiness improvements

### Engineering Approach

My focus is not simply on generating working code, but on understanding the architecture, validating behavior, handling edge cases, and building maintainable systems.

I use AI-assisted development tools as part of my workflow while taking responsibility for technical decisions, implementation, debugging, integration, and verification.

**Project Status:** Active development — core mission management and geospatial functionality implemented; responder mapping and automated QA infrastructure in progress.
