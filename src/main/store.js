'use strict';
import { app } from 'electron';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';

export default class Store {
  constructor(options) {
    const userDataPath = app.getPath('userData');
    this.path = join(userDataPath, `${options.configName}.json`);
    this.data = {
      ...options.defaults,
      ...parseDataFile(this.path, options.defaults)
    };
    console.log(this.path);
  }

  get(key) {
    return this.data[key];
  }

  set(key, val) {
    this.data[key] = val;
    writeFileSync(this.path, JSON.stringify(this.data));
  }
}

function parseDataFile(filePath, defaults) {
  try {
    return JSON.parse(readFileSync(filePath));
  } catch(error) {
    return defaults;
  }
}
