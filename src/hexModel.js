'use strict';

import {range} from './libhex.js'
import * as readline from "readline/promises";

export let white = {value: 1, getICoord: h => h.iRow, getJCoord: h => h.iCol, prompt:'██'};
export const black = {value: -1, getICoord: h => h.iCol, getJCoord: h => h.iRow, prompt:'  ', other: white};
white.other = black;

/**
 * A Hex is a hexagonal cell of the Hex board
 * */
class Hex {

    constructor(game, iRow, iCol) {
        this.game = game;
        this.iRow = iRow;
        this.iCol = iCol;
        /** the color of the token on the cell 
         * */
        this.color = undefined;
        /** the possible chain containing the token on the cell
         * */
        this.chain = undefined;
    }
    getColumnLetter() {
      // 65 = A 
      return String.fromCharCode(65 + this.iCol);
    }

    playWhite() {
        this.play(white);
    }

    play(color) {
        if (this.color !== undefined) {
            throw new Error('illegal move');
        }
        this.color = color;
        const chains = new Set(
            this.game.getNeighbourHexes(this.iRow, this.iCol)
                .filter(h => h.color === this.color)
                .map(h => h.chain));
        if (chains.size === 0) {
            this.chain = new Chain(this);
        } else {
            const iter = chains.values();
            let iteratorResult = iter.next();
            const firstChain = iteratorResult.value;
            firstChain.addHex(this);
            iteratorResult = iter.next();
            while (!iteratorResult.done) {
                iteratorResult = iter.next();
                firstChain.addChain(iteratorResult.value);
            }
        }
        if (this.chain.isWinning()) {
            return this.chain;
        }
        return null;
    }

    getICoord() {
        return this.color.getICoord(this);
    }

    toString() {
        return `${this.getColumnLetter()}${this.iRow + 1}`;
    }

    compareTo(other) {
        if (this.iRow < other.iRow) {
            return -1;
        } else if  (this.iRow > other.iRow) {
            return 1;
        } else if (this.iCol < other.iCol) {
            return -1;
        } else if (this.iCol > other.iCol) {
            return 1;
        } else {
            return 0;
        }
    }
}
class Chain {
    constructor(hex) {
        this.hexes = [hex];
        this.game = hex.game;
        this.isTouchingHigh = (hex.getICoord() === this.game.size - 1);
        this.isTouchingLow = (hex.getICoord() === 0);
        this.game.chains.get(hex.color).add(this);
    }
    
    getColor() {
        return this.hexes[0].color;
    }
    
    addHex(hex) {
        this.hexes.push(hex);
        hex.chain = this;
        this.isTouchingHigh ||= (hex.getICoord() === this.game.size - 1);
        this.isTouchingLow ||= (hex.getICoord() === 0);
    }

    addChain(chain) {
        this.hexes = this.hexes.concat(chain.hexes);
        chain.hexes.forEach(h => h.chain = this);
        this.game.chains.get(this.getColor()).delete(chain);
        this.isTouchingHigh ||= chain.isTouchingHigh;
        this.isTouchingLow ||= chain.isTouchingLow;
    }

    isWinning() {
        return this.isTouchingHigh && this.isTouchingLow;
    }

    toString() {
        return this.hexes
        .toSorted((h, i) => h.compareTo(i))
        .map(h => h.toString()).join(' ');
    }
}

export class Game {
    constructor(size) {
        this.size = size;
        this.board = range(size).map(iRow => range(size).map((iCol) => new Hex(this, iRow, iCol)));
        this.chains = new Map();
        this.chains.set(white, new Set());
        this.chains.set(black, new Set());
        this.currentColor = white;
    }

    play(iRow, iCol) {
        if (iRow < 0 || iRow >= this.size || iCol < 0 || iCol >= this.size) {
            throw new Error(`out of board ${iRow} ${iCol}`);
        }
        const winningChain = this.board[iRow][iCol].play(this.currentColor);
        if (winningChain) {
            return winningChain;
        } else {
            this.currentColor = this.currentColor.other;
        }
    }

    getNeighbourHexes(iRow, iCol) {
        return [[iRow - 1, iCol], [iRow - 1, iCol + 1], [iRow, iCol -1], [iRow, iCol + 1], [iRow + 1, iCol -1], [iRow + 1, iCol]].filter(
            rc => rc[0] >= 0 && rc[0] < this.size && rc[1] >= 0 && rc[1] < this.size).map(
            rc => this.board[rc[0]][rc[1]]);
    }

    colIndexFromLetter(letter) {
      return letter.toUpperCase().charCodeAt(0) - 65;
    }

    playFromHumanString(str) {
        const letter = str[0];
        if (!/[a-zA-Z]/.test(letter)){
            throw Error ("invalid column");
        }
        return this.play(parseInt(str.substr(1)) - 1, this.colIndexFromLetter(letter));
    }

    async prompt() {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        let won = false;
        while (!won) {
            const input = await rl.question(`${this.currentColor.prompt}:`);
            const winningChain = this.playFromHumanString(input);
            if (winningChain) {
                console.log(winningChain.toString());
                return;
            }
        }
    }
}
