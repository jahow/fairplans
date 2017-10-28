# Fairplans, a tool to help you manage your projects and resources!

**Fairplans** is a web application that gives you tools to manage multiple project in terms of planning, tasks and resources.



This project is in beta and may not completely fit your needs yet. Please help improve it if you have the chance!

Usage instructions yet to come.

### Installation instructions

#### Prerequisites
- Git: http://git-scm.com
- Meteor: https://www.meteor.com
- NodeJS (version 4.6.0 and above): http://nodejs.org

#### Getting the project
1. Grab the sources from the git repo:
   ```
   $ git clone http://www.github.com/jahow/fairplans.git
   ```

2. Install Typescript build tool:
   ```
   $ npm install tsc --global
   ```

3. *Windows only*: Install build tools for NPM modules in C++:
   ```
   $ npm install windows-build-tools --global
   ```

4. Install other dependencies at the root of the project:
   ```
   $ npm install
   ```

5. Start Meteor (at the root of the project too):
   ```
   $ meteor
   ```
   Meteor will then start in development mode: it will automatically start a MongoDB instance and will rebuild the project every time the codebase is changed. The application can be reached with a browser pointing at `http://localhost:3000`.