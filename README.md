# Open-source stack

![GitHub Repo stars](https://img.shields.io/github/stars/forge42dev/open-source-stack?style=social)
![npm](https://img.shields.io/npm/v/open-source-stack?style=plastic)
![GitHub](https://img.shields.io/github/license/forge42dev/open-source-stack?style=plastic)
![npm](https://img.shields.io/npm/dy/open-source-stack?style=plastic) 
![npm](https://img.shields.io/npm/dw/open-source-stack?style=plastic) 
![GitHub top language](https://img.shields.io/github/languages/top/forge42dev/open-source-stack?style=plastic) 

Full starter stack to develop CJS/ESM compatible npm packages with TypeScript, Vitest, ESLint, Prettier, and GitHub Actions.


Deploy your open-source project to npm with ease, with fully covered bundling, testing, linting and deployment setup out of the box,
don't worry about CJS or ESM, bundling your typescript definitions or anything else, focus on coding out your solution and let the stack take care of the rest.

Build your own open-source project today! 🚀

## Tools

- **TypeScript**: TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.
- **Vitest**: A modern test runner built on top of Vite.
- **ESLint**: ESLint statically analyzes your code to quickly find problems.
- **Prettier**: Prettier is an opinionated code formatter.
- **GitHub Actions**: Automate your workflow from idea to production.
- **tsup** - Zero-config bundler for tiny TypeScript libraries.

## Features

- **ESM/CJS ready** - Write your code in TypeScript and publish it as ESM and CJS with 0 configuration.
- **Are The types wrong? ready** - Passes all the checks for typings on https://arethetypeswrong.github.io/ by default.
- **ESM/CJS test apps setup** - Test your package in both ESM and CJS environments already setup for you.
- **Test runner setup** - Test your open source package with Vitest already setup for you.
- **Linting setup** - Lint your code with ESLint and Prettier already setup for you.
- **GitHub Actions setup** - Automate deployments to npm by using GitHub Actions.

## Setup

1. Use this template to create a new repository.
2. Clone the repository.
3. Change the package name in `package.json`.
4. Change the `open-source-stack` dependency in your test-apps to your name
5. Install the dependencies with `npm install`.
6. Change the `repository`, `bugs`, and `homepage` fields in `package.json` to your github repo.
7. Change the license if required.
8. Add the NPM_TOKEN secret to your GitHub repository.
9. Start coding!

## Scripts

- `npm run build` - Build the package.
- `npm run test` - Run the tests.
- `npm run lint` - Lint the code.
- `npm run dev` - Start the package and ESM test app in watch mode for development.
- `npm run dev:cjs` - Start the package and CJS test app in watch mode for development.

