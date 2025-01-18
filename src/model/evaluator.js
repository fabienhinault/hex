import {white, black} from './hexModel.js';
import { pickWeighted, pick } from '../libhex.js';


const unsure = 0;


function checkNotNan(n) {
    if (Number.isNaN(n)) {
        throw new Error();
    }
    return n;
}



export class Evaluator {
    constructor(game, sequenceValueStorage, player) {
        this.game = game;
        this.game.evaluator = this;
        this.sequenceValueStorage = sequenceValueStorage;
        this.player = player ?? black;
        if (this.game.dispatcher) {
            this.game.addGameOverListener(evt => this.onGameOver(evt.winner));
        }
        this.WinningValue = new Map();
        this.WinningValue.set(white, game.size * 4);
        this.WinningValue.set(black, -game.size * 4);
        this.done = false;
    }

    /* The value of a sequence says if the sequence is winning for firstPlayer or secondPlayer.
     * It is winning for firstPlayer if the value is close to firstPlayerValue, and same for secondPlayer.
     * The value of the sequence depends on the value of its successors.
     * All players are considered good. If a winning move exists, the evaluation supposes she will take it.
     */
    evaluateSequence(game) {
        // player who just played last move
        const previousPlayer = game.currentColor.other;
        const nextPlayer = game.currentColor;
        const nexts = game.board.flat().filter(h => h.color === undefined);
        const nextsValues = nexts.map(next => this.getSequenceValue(game.after(next.iRow, next.iCol)));
        const bestValue = nextPlayer.getBestValue(nextsValues);
        const nextWin = this.WinningValue.get(nextPlayer);
        const prevWin = this.WinningValue.get(previousPlayer);
        if (bestValue === nextWin) {
            // the current sequence is considered winning for nextPlayer.
            // attenuated for the possible losing moves, and the distance.
            return checkNotNan(nextPlayer.attenuate(bestValue, nextsValues.filter(v => v !== nextWin).length + 1));
        }
        if (bestValue === prevWin) {
            return checkNotNan(previousPlayer.attenuate(bestValue, nextsValues.filter(v => v !== prevWin).length + 1));
        }
        return checkNotNan(bestValue);
    }

    evaluateAllSubsequences() {
        const lastPlayerValue = this.game.getRawValue();
        this.sequenceValueStorage.storeValue(this.game.toPositionString(), lastPlayerValue);
        if (this.game.sequence.length > 0) {
            const oneMoveBefore = this.game.toOneMoveBefore();
            this.sequenceValueStorage.storeValue(oneMoveBefore.toPositionString(), lastPlayerValue);
        }
        for (let game of this.game.getReverseSequence()) {
            const value = this.evaluateSequence(game);
            if (Number.isNaN(value)) {
                throw new Error();
            }
            if (Math.abs(value) > game.size) {
                this.sequenceValueStorage.storeValue(game.toPositionString(), value);
            } else {
                break;
            }
        }
    }

    evaluateBack(length, stored) {
        const previousPlayer = players[length % 2];
        const nextPlayer = previousPlayer.other;
        const nextStoreds = stored.nexts.map(n => this.sequenceValueStorage.getValue(length + 1, n));
        const nextValues = nextStoreds.map(s => s.value ?? s.rawValue)
        const bestValue = nextPlayer.getBestValue(nextsValues);
        stored.value = bestValue;
    }

    evaluateBackAll(length) {
        if (!this.done) {
            this.done = true;
            for (let len = length; len > this.game.sequence.length - 1; len--) {
                const map = this.sequenceValueStorage.getMap(len);
                for (stored of map.values) {
                    stored.value = this.evaluateBackAll(len, stored);
                }
            }
        }
    }

    getSequenceValue(game) {
        const storedValue = this.sequenceValueStorage.getValue(game.toPositionString());
        if (storedValue !== null && storedValue !== undefined) {
            return Number(storedValue);
        }
        return game.getRawValue();
    }


    evaluateNexts(initiator, time) {
        this.evaluateAbstract(initiator, time, (evaluator, t) => {
            setTimeout(() => {
                evaluator.evaluateNexts(initiator, t);
            }, 0);
        });
    }

    evaluateNextsSync(initiator, time) {
        this.evaluateAbstract(initiator, time, (evaluator, t) => {
            evaluator.evaluateNextsSync(initiator, t);
        });
    }

    evaluateAbstract(initiator, time, f) {
        const positionString = this.game.getCanonicalPositionString();
        const length = this.game.sequence.length;
        if (this.sequenceValueStorage.getValue(length, positionString) !== undefined) {
            return;
        }
        const now = this.game.clock.getTime()
        if (!time || now < time) {
            const possibleNexts = this.game.getPossibleNexts().map(h => this.game.afterHex(h));
            const remainingTime = (time - now) / possibleNexts.length;
            this.store(positionString, possibleNexts);
            for (let iNext = 0; iNext < possibleNexts.length; iNext++) {
                const gameCopy = possibleNexts[iNext];
                const evaluator = new Evaluator(gameCopy, this.sequenceValueStorage, this.player);
                const over = gameCopy.over;
                if (gameCopy.over) {
                    this.storeWinningGame(gameCopy);
                } else {
                    f(evaluator, now + ((iNext + 1) * remainingTime));
                }
            }
        } else {
            initiator.evaluateBackAll(length);
        }
    }

    store(positionString, possibleNexts) {
        this.sequenceValueStorage.storeValue(this.game.sequence.length, positionString, {
            rawValue: this.game.getRawValue(),
            value: undefined,
            nexts: possibleNexts.map(g => g.getCanonicalPositionString())
        });
    }

    storeWinningGame(gameCopy) {
        this.sequenceValueStorage.storeValue(
            gameCopy.sequence.length,
            gameCopy.getCanonicalPositionString(),
            {
                rawValue: this.game.getRawValue(),
                value: this.game.getRawValue(),
                nexts: []
            }
        );
    }

    // choose best next move for bot
    chooseNext() {
        const possibleNextsValues = this.game.getPossibleNexts().map(move => {return {move, value:this.getMoveValue(move)};});
        const winning = possibleNextsValues.find(mv => this.player.isWinning(mv.value, this.game.size));
        if (winning) {
            return pick(this.player.getArgsBest(possibleNextsValues, _ => _.value)).move;
        }
        const notLosings = possibleNextsValues.filter(mv => !this.player.other.isWinning(mv.value, this.game.size));
        if (notLosings.length >= 1) {
            const weighteds = notLosings.map(_ => {
                return {move: _.move, weight: Math.abs(_.value)};
            });
            return (pickWeighted(weighteds)).move;
        } else {
            return pick(this.player.getArgsBest(possibleNextsValues, _ => _.value)).move;
        }
    }

    getMoveValue(hex) {
        return this.getSequenceValue(this.game.after(hex.iRow, hex.iCol));
    }
}


export class MemorySequenceValueStorage {
    constructor(size) {
        this.values = new Array(size * size).fill(0).map(x => new Map());
    }
    storeValue(length, positionString, value) {
        this.values[length].set(positionString, value);
    }
    getMap(length) {
        return this.values[length];
    }
    getValue(length, positionString) {
        return this.values[length].get(positionString);
    }
    removeValue(length, positionString) {
        this.values[length].delete(positionString);
    }
}
