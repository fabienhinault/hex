'use strict';

import {Game} from './model/hexModel.js';
import * as readline from "readline/promises";

const game = new Game(5);

await game.twoPlayers();
