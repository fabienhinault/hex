'use strict';

import {range, argsOpt, optimum } from '../libhex.js'
import * as readline from "readline/promises";

class Player {
    constructor(value, getICoord, getJCoord, getIJHex, compare, initialValue, prompt, positionString, other) {
        this.value = value;
        this.getICoord = getICoord;
        this.getJCoord = getJCoord;
        this.getIJHex = getIJHex;
        this.initialValue = initialValue;
        this.compare = compare;
        this.prompt = prompt;
        this.positionString = positionString;
        this.other = other;
    }

    getBestValue(values) {
        return optimum(values, x => x, this.compare, this.initialValue).value;
    }

    getArgsBest(elements, f) {
        return argsOpt(elements, f, this.compare, this.initialValue);
    }

    attenuate(value) {
        return value - 0.1 * this.value;
    }

    isWinning(value, size) {
        return this.compare(value, this.value * 2 * size)
    }
}

export let white = new Player(1, h => h.iRow, h => h.iCol, (board, i, j) => board[i][j], (x, y) => x > y, Number.NEGATIVE_INFINITY, '●', 'w', null);
export const black = new Player(
    -1, h => h.iCol, h => h.iRow, (board, i, j) => board[j][i], (x, y) => x < y, Number.POSITIVE_INFINITY, '\x1b[43m\x1b[30m●\x1b[0m', 'b', white);
white.other = black;
export let players = [white, black];

export function getLastPlayer(moves) {
    return players[(moves.length % 2)];
}

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
                firstChain.addChain(iteratorResult.value);
                iteratorResult = iter.next();
            }
        }
        if (this.chain.isWinning()) {
            return this.chain;
        }
        return null;
    }

    unplay() {
        if (this.color === undefined) {
            throw new Error('illegal unmove');
        }
        const exColor = this.color;
        this.color = undefined;
        const exChain = this.chain;
        this.chain = undefined;
        this.game.chains.get(exColor).delete(exChain);
        exChain.hexes.forEach(h => h.color = undefined);
        exChain.hexes.forEach(h => {if (h !== this) {h.play(exColor)}});
    }

    getICoord() {
        return this.color.getICoord(this);
    }

    getJCoord() {
        return this.color.getJCoord(this);
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

    getPrompt(prompter) {
        if (this.color === undefined) {
            return '·';
        } else {
            return prompter.prompt(this.color);
        }
    }

    getPositionString() {
        return this.color
    }
}

class Chain {
    constructor(hex) {
        this.hexes = [hex];
        this.game = hex.game;
        this.isTouchingHigh = (hex.getICoord() === this.game.size - 1);
        this.isTouchingLow = (hex.getICoord() === 0);
        this.minICoord = hex.getICoord();
        this.maxICoord = hex.getICoord();
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
        this.minICoord = Math.min(this.minICoord, hex.getICoord());
        this.maxICoord = Math.max(this.maxICoord, hex.getICoord());
    }

    addChain(chain) {
        this.hexes = this.hexes.concat(chain.hexes);
        chain.hexes.forEach(h => h.chain = this);
        this.game.chains.get(this.getColor()).delete(chain);
        this.isTouchingHigh ||= chain.isTouchingHigh;
        this.isTouchingLow ||= chain.isTouchingLow;
        this.minICoord = Math.min(this.minICoord, chain.minICoord);
        this.maxICoord = Math.max(this.maxICoord, chain.maxICoord);
    }

    isWinning() {
        return this.isTouchingHigh && this.isTouchingLow;
    }

    toString() {
        return this.hexes
        .toSorted((h, i) => h.compareTo(i))
        .map(h => h.toString()).join(' ');
    }

    getValue() {
        if (this.isWinning()) {
            return 4 * this.game.size;
        }
        let value = this.maxICoord - this.minICoord;
        if (this.isTouchingHigh || this.isTouchingLow) {
            value *= 2;
        }
        return value;
    }

    pushIfFree(i, j, result) {
        if (j < 0 || j >= this.game.size) {
            return;
        }
        const hex = this.getColor().getIJHex(this.game.board, i, j);
        if (hex.color === undefined) {
            result.push(hex);
        }
    }

    getFreeICoordLowNeighbours() {
        const extremeHexesJcoords = this.hexes.filter(h => h.getICoord() === this.minICoord).map(h => this.getColor().getJCoord(h));
        extremeHexesJcoords.sort((a, b) => a - b);
        const result = [];
        let jPrev = -2;
        for (let j of extremeHexesJcoords) {
            if (j - jPrev > 1) {
                this.pushIfFree(this.minICoord - 1, j, result);
            }
            this.pushIfFree(this.minICoord - 1, j + 1, result);
        }
        return result;
    }

    getFreeICoordHighNeighbours() {
        const extremeHexesJcoords = this.hexes.filter(h => h.getICoord() === this.maxICoord).map(h => this.getColor().getJCoord(h));
        extremeHexesJcoords.sort((a, b) => a - b);
        const result = [];
        let jPrev = -2;
        for (let j of extremeHexesJcoords) {
            if (j - jPrev > 1) {
                this.pushIfFree(this.maxICoord + 1, j - 1, result);
            }
            this.pushIfFree(this.maxICoord + 1, j, result);
        }
        return result;
    }

    getFreeICoordPartialNeighbours(extremeICoord, newExtremeICoord) {
        const extremeHexesJcoords = this.hexes.filter(h => h.getICoord() === extremeICoord).map(h => this.getColor().getJCoord(h));
        extremeHexesJcoords.sort((a, b) => a - b);
        const result = [];
        let jPrev = -2;
        for (let j of extremeHexesJcoords) {
            if (j - jPrev > 1) {
                this.pushIfFree(newExtremeICoord, j, result);
            }
            this.pushIfFree(newExtremeICoord, j + 1, result);
        }
        return result;
    }

    getFreeICoordNeighbours() {
        const result = [];
        if (! this.isTouchingLow) {
            this.getFreeICoordLowNeighbours().forEach(h => result.push(h));
        }
        if (! this.isTouchingHigh) {
            this.getFreeICoordHighNeighbours().forEach(h => result.push(h));
        }
        return result;
    }

    addIfFree(i, j, set) {
        if (j < 0 || j >= this.game.size) {
            return;
        }
        const hex = this.getColor().getIJHex(this.game.board, i, j);
        if (hex.color === undefined) {
            set.add(hex);
        }
    }

    getFreeJCoordNeighbours() {
        const sets = new Array(this.maxICoord + 1).fill(0).map(z => new Set());
        for (let hex of this.hexes) {
            this.addIfFree(hex.getICoord(), hex.getJCoord() - 1, sets[hex.getICoord()]);
            this.addIfFree(hex.getICoord(), hex.getJCoord() + 1, sets[hex.getICoord()]);
        }
        const result = [];
        for (let i = this.minICoord; i <= this.maxICoord; i++) {
            sets[i].forEach(h => result.push(h));
        }
        return result;
    }

    getFreeNeighbours () {
        return this.getFreeICoordNeighbours().concat(this.getFreeJCoordNeighbours());
    }
}

function getLinePositionString(line) {
    return getLongLinePositionString(line).replaceAll(/ +/g, spaces => spaces.length);
}

function getLongLinePositionString(line) {
    return line.map(h => h.color?.positionString ?? ' ').join('');
}

function getRowPrompt(row, iRow, prompter) {
    return `${" ".repeat(iRow)}${iRow + 1}  ${row.map(h => h.getPrompt(prompter)).join(' ')}  ${iRow + 1}`;
}

function reverseString(str) {
    return str.split('').reverse().join('');
}

export function reversePositionString(position) {
    const re = /w|b|[0-9]+|\//g
    return [... position.matchAll(re)].reverse().join('');
}

function isPositionStringCanonical(str) {
    return str.localeCompare(reversePositionString(str)) > 0;
}

class Clock {
    getTime() {
        return Date.now();
    }
}

const clock = new Clock();

export class Game {
    constructor(size) {
        this.size = size;
        this.board = range(size).map(iRow => range(size).map((iCol) => new Hex(this, iRow, iCol)));
        this.chains = new Map();
        this.chains.set(white, new Set());
        this.chains.set(black, new Set());
        this.currentColor = white;
        this.sequence = [];
        this.clock = clock;
        this.maxChainValue = this.size * 4;
        this.over = false;
    }

    copy() {
        let g = new Game(this.size);
        for (let [iRow, iCol] of this.sequence) {
            g.play(iRow, iCol);
        }
        return g;
    }

    play(iRow, iCol) {
        if (this.over) {
            throw new Error('The game is over');
        }
        if (iRow < 0 || iRow >= this.size || iCol < 0 || iCol >= this.size) {
            throw new Error(`out of board ${iRow} ${iCol}`);
        }
        this.sequence.push([iRow, iCol]);
        const winningChain = this.board[iRow][iCol].play(this.currentColor);
        this.currentColor = this.currentColor.other;
        if (winningChain) {
            this.over = true;
            return winningChain;
        }
    }

    after(iRow, iCol) {
        let result = this.copy();
        result.play(iRow, iCol);
        return result;
    }

    afterHex(hex) {
        return this.after(hex.iRow, hex.iCol);
    }

    unplay() {
        if (this.sequence.length === 0) {
            throw new Error('no move to unplay');
        }
        this.over = false;
        let [iRow, iCol] = this.sequence.pop();
        this.board[iRow][iCol].unplay();
        this.currentColor = this.currentColor.other;
    }

    toOneMoveBefore() {
        let g = new Game(this.size);
        for (let [iRow, iCol] of this.sequence.slice(0, this.sequence.length - 1)) {
            g.play(iRow, iCol);
        }
        return g;
    }

    getReverseSequence() {
        if (this.sequence.length <= 2) {
            return [];
        }
        let result = [];
        let game = this.copy();
        // sequence is interesting only 2 moves before.
        game.unplay();
        game.unplay();
        while (game.sequence.length > 0) {
            result.push(game);
            game = game.toOneMoveBefore();
        }
        return result;
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

    async twoPlayers() {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        while (true) {
            try{
                const winningChain = await this.promptOnce(rl);
                if (winningChain) {
                    return;
                }
            } catch (e) {
                console.log(e.message);
                continue;
            }
        }
    }

    async promptOnce(rl) {
        const colored = new ColoredPrompter();
        const input = await rl.question(`${this.getPrompt(colored)}\n${this.currentColor.prompt}:`);
        const winningChain = this.playFromHumanString(input);
        if (winningChain) {
            console.log(this.getPrompt(colored));
            console.log(winningChain.toString());
        }
        return winningChain;
    }

    getAbstractPrompt(prompter) {
        return `  ${prompter.reverse(this.getLetters())}\n${this.board.map((row, iRow) => getRowPrompt(row, iRow, prompter)).join('\n')}\n${' '.repeat(this.size + 3)}${prompter.reverse(this.getLetters())}\n`;
    }

    getPrompt() {
        return this.getAbstractPrompt(new ColoredPrompter());
    }

    getMonochromePrompt() {
        return this.getAbstractPrompt(new MonochromePrompter());
    }

    reversed(str) {
        return `\x1b[47m\x1b[30m${str}\x1b[0m`;
    }

    getLetters() {
        return this.board[0].map(h => h.getColumnLetter()).join(' ');
    }

    toPositionString() {
        return this.board.map(getLinePositionString).join('/');
    }

    toPositionStrings() {
        const positionString = this.toPositionString();
        const reversed = reversePositionString(positionString);
        if (positionString === reversed) {
            return [positionString];
        } else {
            return [positionString, reversed];
        }
    }

    getCanonicalPositionString() {
        const positionString = this.toPositionString();
        const reversed = reversePositionString(positionString);
        if (positionString.localeCompare(reversed) > 0) {
            return positionString;
        } else {
            return reversed;
        }
    }

    // symetric with respect to the main diagonal
    toDiagSym() {
        const result = new Game(this.size);
        for (let m of this.sequence) {
            result.play(m[1], m[0]);
        }
    }

    // symetric with respect to the center of the board
    toCentralSym() {
        const result = new Game(this.size);
        for (let m of this.sequence) {
            result.play(this.size - 1 - m[0], this.size - 1 - m[1]);
        }
        return result;

    }

    // symetric with respect to the anti-diagonal
    toAntidiagSym() {
        const result = new Game(this.size);
        for (let m of this.sequence) {
            result.play(this.size - 1 - m[1], this.size - 1 - m[0]);
        }
        return result;
    }

    getRawValue() {
        if (this.sequence.length < 2) {
            return 0;
        }
        const maxWhite = Math.max(...[...this.chains.get(white)].map(c => c.getValue()));
        const maxBlack = Math.max(...[...this.chains.get(black)].map(c => c.getValue()));
        if (maxWhite === this.maxChainValue) {
            return maxWhite;
        } else if (maxBlack  === this.maxChainValue) {
            return -maxBlack;
        } else {
            return maxWhite - maxBlack;
        }
    }

    getPossibleNexts() {
        if (this.over) {
            return [];
        } else {
            const nexts = this.board.flat().filter(h => h.color === undefined);
            const neighbours = [...this.chains.get(this.currentColor)]
                .toSorted((c1, c2) => c2.hexes.length - c1.hexes.length)
                .map(c => c.getFreeNeighbours())
                .flat()
                .reduce((acc, current) => {if (!acc.includes(current)) {acc.push(current);} return acc;}, []);
            return neighbours.concat(nexts.filter(h => !neighbours.includes(h)));
        }
    }

    isWinning() {
        return [...this.chains.get(this.currentColor.other).values()].some(c => c.isWinning);
    }

}

class MonochromePrompter {
    prompt(player) {
        return player.positionString;
    }

    reverse(str) {
        // do not reverse at all
        return str;
    }
}

class ColoredPrompter {
    prompt(player) {
        return player.prompt;
    }
    
    reverse(str) {
        return `\x1b[47m\x1b[30m${str}\x1b[0m`;
    }
}
