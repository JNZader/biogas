# BioGas Plant Operations Dashboard

[![Build Status](https://img.shields.io/github/workflow/status/user/repo/CI)](https://github.com/user/repo/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An integral digital platform for biogas plant operators, technicians, and engineers to collect, organize, and visualize operational data, featuring AI-powered feeding recommendations to optimize biogas production.

## ✨ Features

- **Real-time Dashboard**: At-a-glance view of key performance indicators (KPIs) like power generation, biogas production, and process stability (FOS/TAC).
- **Data Visualization**: Interactive charts and graphs to track historical trends for production, gas quality, and substrate mix.
- **AI-Powered Recommendations**: Utilizes Google's Gemini AI to provide optimal daily feeding recommendations based on substrate analysis.
- **Comprehensive Data Entry**: Dedicated modules for logging all critical plant operations:
  - Substrate Inputs
  - Feeding Records
  - Gas Quality Readings
  - FOS/TAC Analysis
  - Energy Generation
  - CHP Power Changes
  - Environmental Monitoring
  - Laboratory Analysis
- **System Management**: Tools for administrators to manage maintenance tasks, stock inventory, users, and core system entities (e.g., substrates, suppliers).
- **Customizable Interface**: Multiple color themes and a dark mode to suit user preference.
- **Responsive Design**: Fully functional on both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [TanStack Router](https://tanstack.com/router/)
- **Data Fetching & State**: [TanStack Query](https://tanstack.com/query/), [Zustand](https://github.com/pmndrs/zustand)
- **Backend & Database**: [Supabase](https://supabase.io/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/), [Heroicons](https://heroicons.com/), [Recharts](https://recharts.org/)
- **AI**: [Google Gemini API](https://ai.google.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later recommended)
- A [Supabase](https://supabase.io/) project
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/biogas-dashboard.git
    cd biogas-dashboard
    ```

2.  **Install dependencies:**
    This project uses modules from a CDN via import maps, so no `npm install` is required for the frontend dependencies.

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Now, fill in the `.env` file with your credentials from Supabase and Google AI Studio.

    ```
    # .env
    SUPABASE_URL="YOUR_SUPABASE_URL"
    SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    API_KEY="YOUR_GEMINI_API_KEY"
    ```
    *Note: The application is designed to work in an environment where these variables are pre-configured (e.g., a hosting platform's environment variable settings).*

4.  **Run the development server:**
    You can serve the `index.html` file using any static server. A simple one is `serve`:
    ```bash
    npm install -g serve
    serve .
    ```
    The application will be available at `http://localhost:3000` (or another port if 3000 is in use).

## 📂 Project Structure

```
.
├── components/       # Shared UI components
├── contexts/         # React Context providers (Auth, Supabase Data)
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── pages/            # Route components for each page
├── services/         # API service clients (Gemini, Supabase)
├── stores/           # Zustand state management stores
├── tests/            # E2E, unit, accessibility, and visual tests
├── types/            # TypeScript type definitions
├── App.tsx           # Main application layout component
├── index.html        # Main HTML entry point
└── index.tsx         # Application root, router setup
```

## Testing

This project includes a comprehensive test suite using [Playwright](https://playwright.dev/) for E2E, accessibility, and visual regression testing, and [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for unit tests.

To run the tests:
```bash
# Run End-to-End tests
npm run test:e2e

# Run Unit tests
npm run test:unit
```
*(Note: Assumes `package.json` scripts are configured for these commands)*

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for more details on how to get started.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
