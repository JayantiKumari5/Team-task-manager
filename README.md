# 🚀 Team Task Manager (Multi-Organization)

A premium, full-stack task management platform built with **React**, **Node.js**, and **Firebase**. This system supports complex hierarchical collaboration across multiple organizations and teams with strict role-based access control (RBAC).

## ✨ Key Features

- **Multi-Organization Architecture**: Create a new organization as a Super Admin or join an existing one.
- **Hierarchical Role System**:
  - **Super Admin**: Full control over the organization, team creation, and Team Admin approvals.
  - **Team Admin**: Manages specific teams, approves members, and handles task management.
  - **Team Member**: Collaborative access to team tasks and status updates.
- **Dynamic Approval Workflow**: 
  - Team Admins must be approved by the Super Admin.
  - Members must be approved by their respective Team Admin.
- **Kanban Task Board**: Real-time task tracking with status columns (Todo, In Progress, Done).
- **Modern UI/UX**: Built with a sleek Glassmorphism design system, responsive layouts, and smooth animations.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Axios, Lucide-React, CSS3 (Vanilla + Glassmorphism).
- **Backend**: Node.js, Express.
- **Database & Auth**: Firebase Firestore, Firebase Authentication.
- **Styling**: Modern CSS variables with full responsiveness.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v16+)
- Firebase Account & Project

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory with your Firebase configuration and Service Account Key.

Run the server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Configure your `firebase.js` with your project's web configuration.

Run the app:
```bash
npm run dev
```

## 📐 Database Schema

The system uses a flat but highly relational Firestore structure:
- **Organizations**: Name, SuperAdmin UID.
- **Teams**: Name, OrganizationID.
- **Users**: Profile data, Role (SuperAdmin/TeamAdmin/Member), Status (Approved/Pending), OrgID, TeamID.
- **Tasks**: Title, Desc, TeamID, AssignedTo, Status, DueDate.

## 🔒 Security & RBAC

All backend routes are protected by custom middleware that validates the Firebase ID Token and injects the user's hierarchical profile. Permissions are strictly enforced:
- Only **Super Admins** can create teams.
- Only **Admins** (Super or Team) can assign or delete tasks.
- **Members** can only update statuses of tasks assigned to them or within their team.

---
Built with ❤️ for collaborative team excellence.
