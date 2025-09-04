# Contributing to the BioGas Dashboard

First off, thank you for considering contributing! We welcome any contributions that improve the project, from fixing bugs to adding new features.

## How to Contribute

1.  **Fork the Repository**: Start by forking the project to your own GitHub account.
2.  **Create a Branch**: Create a new branch from `main` for your feature or bug fix. Use a descriptive name like `feature/add-new-chart` or `fix/login-validation`.
    ```bash
    git checkout -b feature/your-amazing-feature
    ```
3.  **Make Your Changes**: Write your code. Follow the existing code style and conventions.
4.  **Commit Your Changes**: Write clear, concise commit messages.
    ```bash
    git commit -m 'feat: Add some amazing feature'
    ```
5.  **Push to Your Branch**:
    ```bash
    git push origin feature/your-amazing-feature
    ```
6.  **Open a Pull Request**: Go to the original repository and open a pull request from your forked branch to the `main` branch. Provide a detailed description of your changes in the PR.

## Development Setup

Please refer to the [Getting Started](#-getting-started) section in the `README.md` file for instructions on how to set up the project locally.

## Coding Standards

- **Style**: We follow standard TypeScript and React best practices. While not yet enforced with a linter, please maintain a consistent style with the existing codebase.
- **Component Structure**: Keep components small and focused. Co-locate feature-specific components, API logic, and types within the relevant page file when they aren't shared.
- **Documentation**: Add JSDoc comments to new components, functions, and complex logic to explain their purpose, parameters, and return values.

## Testing

Please ensure that your changes do not break any existing tests. If you are adding a new feature, it is highly encouraged to add corresponding unit or E2E tests.

- Run tests locally using the commands in the `README.md`.

## Pull Request Process

1.  Ensure your code is well-formatted and documented.
2.  Make sure all existing tests are passing.
3.  Update the `README.md` if your changes affect the setup, features, or architecture.
4.  Your PR will be reviewed by the maintainers. Be prepared to address any feedback.

Thank you for your contribution!
