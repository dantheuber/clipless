# Clipless
> A clipboard manager for office workers developed with [`electron-webpack`](https://github.com/electron-userland/electron-webpack).

## Feature List
Review the [planning document](https://github.com/dantheuber/clipless/blob/master/PlanningDocument.md) for in depth plans for this project going forward.

### Currently implemented Features
1. Maintain an ongoing list of the last 10 items copied to your clipboard.
2. Use hotkey to quickly retrieve the contents of a previous clip:
  - `ctrl+{number}` on windows or linux
  - `command+{number}` on Mac
3. Lock a previous clips contents, useful for saving an item that you would like to access at a later time without going back to re-copy it from a given source.
4. Make manual changes to a previous clip.
5. Create clip compilation templates as described in the [planning document](https://github.com/dantheuber/clipless/blob/master/PlanningDocument.md#clip-compile-templates)
  - Use `ctrl+shift+~` to view list of templates and select one by clicking on it or tabbing thru the list.

### Planned Features

1. [Quick Clip Launch](https://github.com/dantheuber/clipless/blob/master/PlanningDocument.md#quick-clip-launch)
2. [Scratch Pad](https://github.com/dantheuber/clipless/issues/27)

## Getting Started
Simply clone down this repository, install dependencies, and start the app.

```bash
# clone the repo
git clone https://github.com/dantheuber/clipless.git
cd clipless

# install dependencies
yarn

# start developing
yarn dev
```

### Development Scripts
```bash
# run application in development mode
yarn dev

# compile source code and create webpack output
yarn compile

# `yarn compile` & create build with electron-builder
yarn dist

# `yarn compile` & create unpacked build with electron-builder
yarn dist:dir
```
