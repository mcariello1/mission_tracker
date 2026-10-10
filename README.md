# Mission Tracker

A full-stack mission management application built with **React, FastAPI, and PostgreSQL**.

Mission Tracker helps search-and-rescue teams manage missions, track personnel check-ins and check-outs, and calculate participation hours using persistent database records.

The project was inspired by a technical system-design exercise involving relational database modeling, user/team relationships, mission participation, and SQL aggregation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, JavaScript, Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Database Driver | psycopg2 |
| API | REST, JSON |
| Development | Git, GitHub, VS Code |

## Features

### Mission Management
- Create new missions with names and locations.
- Retrieve missions from PostgreSQL.
- Select missions dynamically from the dashboard.
- View mission-specific participation records and hours.

### Personnel Tracking
- Retrieve users and mission team members.
- Check personnel into and out of missions.
- Record timestamps for each participation session.
- Prevent duplicate active check-ins through API validation
